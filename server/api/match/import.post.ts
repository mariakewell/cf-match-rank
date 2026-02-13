import { inflateRawSync } from 'node:zlib';
import { createError, defineEventHandler, readFormData } from 'h3';
import { sql } from 'drizzle-orm';
import { matches, players } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';

type ImportRecord = {
  date: string;
  p1Name: string;
  s1Text: string;
  s2Text: string;
  p2Name: string;
  winner: string;
  group: string;
  source: string;
};

type SheetCell = {
  idx: number;
  type: string;
  styleIndex: number;
  value: string;
};

/**
 * 解析单行 CSV，支持双引号包裹字段。
 */
function parseCsvLine(line: string) {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      columns.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  columns.push(current.trim());
  return columns;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatYmd(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function excelSerialToDateString(serial: number) {
  if (!Number.isFinite(serial)) return null;
  const wholeDays = Math.floor(serial);
  if (wholeDays <= 0) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const utcMs = epoch + wholeDays * 24 * 60 * 60 * 1000;
  const dt = new Date(utcMs);
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function normalizeDateValue(raw: string) {
  const value = raw.trim();
  if (!value) return '';

  if (/^\d+(\.\d+)?$/.test(value)) {
    const asNumber = Number(value);
    if (asNumber >= 1 && asNumber <= 100000) {
      const excelDate = excelSerialToDateString(asNumber);
      if (excelDate) return excelDate;
    }
  }

  const compact = value.replace(/\s+/g, '');
  if (/^\d{8}$/.test(compact)) {
    const y = Number(compact.slice(0, 4));
    const m = Number(compact.slice(4, 6));
    const d = Number(compact.slice(6, 8));
    if (y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return formatYmd(y, m, d);
    }
  }

  const normalized = compact
    .replace(/[年./]/g, '-')
    .replace(/[月]/g, '-')
    .replace(/[日号]/g, '')
    .replace(/_/g, '-')
    .replace(/--+/g, '-');

  const partMatch = normalized.match(/^(\d{1,4})-(\d{1,2})-(\d{1,4})(?:[T\s].*)?$/);
  if (partMatch) {
    let a = Number(partMatch[1]);
    let b = Number(partMatch[2]);
    let c = Number(partMatch[3]);

    if (a >= 1900 && a <= 2200) {
      return formatYmd(a, b, c);
    }

    if (c >= 1900 && c <= 2200) {
      // dd-mm-yyyy / mm-dd-yyyy 自动判断
      if (a > 12 && b <= 12) {
        return formatYmd(c, b, a);
      }
      if (b > 12 && a <= 12) {
        return formatYmd(c, a, b);
      }
      return formatYmd(c, b, a);
    }
  }

  const dt = new Date(value);
  if (!Number.isNaN(dt.getTime())) {
    return formatYmd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }

  return value;
}

function decodeBestEffort(bytes: Uint8Array) {
  const encodings = ['utf-8', 'utf-16le', 'gb18030', 'big5', 'shift_jis'];
  const candidates = encodings.map((encoding) => {
    try {
      const text = new TextDecoder(encoding as any, { fatal: false }).decode(bytes);
      const replacementCount = (text.match(/�/g) || []).length;
      const controlCount = (text.match(/[\x00-\x08\x0E-\x1F]/g) || []).length;
      return { text, score: replacementCount * 10 + controlCount };
    } catch {
      return null;
    }
  }).filter(Boolean) as Array<{ text: string; score: number }>;

  if (!candidates.length) {
    return new TextDecoder('utf-8').decode(bytes);
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].text;
}

function parseCsvRecords(raw: string) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    throw createError({ statusCode: 400, statusMessage: 'CSV 内容为空' });
  }

  return lines.slice(1).map((line) => {
    const [date = '', p1Name = '', s1Text = '', s2Text = '', p2Name = '', winner = '', group = ''] = parseCsvLine(line);
    return { date, p1Name, s1Text, s2Text, p2Name, winner, group, source: line };
  });
}

function parseTabularTextRecords(raw: string) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    throw createError({ statusCode: 400, statusMessage: '表格内容为空' });
  }

  return lines.slice(1).map((line) => {
    const [date = '', p1Name = '', s1Text = '', s2Text = '', p2Name = '', winner = '', group = ''] = line.split('\t').map((cell) => cell.trim());
    return { date, p1Name, s1Text, s2Text, p2Name, winner, group, source: line };
  });
}

function getUint16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function getUint32LE(bytes: Uint8Array, offset: number) {
  return (bytes[offset]) | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function unzipEntries(raw: ArrayBuffer) {
  const bytes = new Uint8Array(raw);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (getUint32LE(bytes, i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw createError({ statusCode: 400, statusMessage: '文件不是有效的 XLSX 压缩包' });
  }

  const centralDirectoryOffset = getUint32LE(bytes, eocdOffset + 16);
  const totalEntries = getUint16LE(bytes, eocdOffset + 10);
  const entries = new Map<string, Uint8Array>();

  let cursor = centralDirectoryOffset;
  const decoder = new TextDecoder('utf-8');
  for (let i = 0; i < totalEntries; i += 1) {
    if (getUint32LE(bytes, cursor) !== 0x02014b50) {
      throw createError({ statusCode: 400, statusMessage: 'XLSX 文件结构损坏（中央目录）' });
    }

    const compressionMethod = getUint16LE(bytes, cursor + 10);
    const compressedSize = getUint32LE(bytes, cursor + 20);
    const filenameLength = getUint16LE(bytes, cursor + 28);
    const extraLength = getUint16LE(bytes, cursor + 30);
    const commentLength = getUint16LE(bytes, cursor + 32);
    const localHeaderOffset = getUint32LE(bytes, cursor + 42);

    const filenameStart = cursor + 46;
    const filename = decoder.decode(bytes.slice(filenameStart, filenameStart + filenameLength));

    if (getUint32LE(bytes, localHeaderOffset) !== 0x04034b50) {
      throw createError({ statusCode: 400, statusMessage: 'XLSX 文件结构损坏（本地头）' });
    }

    const localFilenameLength = getUint16LE(bytes, localHeaderOffset + 26);
    const localExtraLength = getUint16LE(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFilenameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);

    let uncompressed: Uint8Array;
    if (compressionMethod === 0) {
      uncompressed = compressed;
    } else if (compressionMethod === 8) {
      uncompressed = inflateRawSync(compressed);
    } else {
      throw createError({ statusCode: 400, statusMessage: `XLSX 包含不支持的压缩方式：${compressionMethod}` });
    }

    entries.set(filename, uncompressed);
    cursor += 46 + filenameLength + extraLength + commentLength;
  }

  return entries;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getColumnIndex(cellRef: string) {
  const letters = cellRef.replace(/\d+/g, '');
  let value = 0;
  for (let i = 0; i < letters.length; i += 1) {
    value = value * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, value - 1);
}

function parseSharedStrings(xml: string) {
  const shared: string[] = [];
  const matches = xml.match(/<si[\s\S]*?<\/si>/g) || [];
  for (const item of matches) {
    const textBits = [...item.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
    shared.push(decodeXmlEntities(textBits.join('')));
  }
  return shared;
}

function parseDateStyleIndexes(stylesXml: string) {
  const builtInDateNumFmt = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);
  const customDateNumFmt = new Set<number>();

  for (const match of stylesXml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]+)"/g)) {
    const numFmtId = Number(match[1]);
    const formatCode = match[2].toLowerCase();
    if (/[ymdhis]/.test(formatCode)) {
      customDateNumFmt.add(numFmtId);
    }
  }

  const dateStyleIndexes = new Set<number>();
  const cellXfsMatch = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] || '';
  const xfMatches = cellXfsMatch.match(/<xf\b[^>]*\/>/g) || [];
  xfMatches.forEach((xf, index) => {
    const numFmtId = Number(xf.match(/\bnumFmtId="(\d+)"/)?.[1] || 0);
    if (builtInDateNumFmt.has(numFmtId) || customDateNumFmt.has(numFmtId)) {
      dateStyleIndexes.add(index);
    }
  });

  return dateStyleIndexes;
}

function parseSheetRows(xml: string, sharedStrings: string[], dateStyleIndexes: Set<number>) {
  const rows: string[][] = [];
  const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) || [];

  for (const rowXml of rowMatches) {
    const parsedCells: SheetCell[] = [];
    const cellMatches = rowXml.match(/<c\b[\s\S]*?<\/c>|<c\b[^>]*\/>/g) || [];

    for (const cellXml of cellMatches) {
      const refMatch = cellXml.match(/\br="([A-Z]+\d+)"/);
      const idx = getColumnIndex(refMatch?.[1] || 'A1');
      const type = cellXml.match(/\bt="([^"]+)"/)?.[1] || '';
      const styleIndex = Number(cellXml.match(/\bs="(\d+)"/)?.[1] || 0);
      let value = '';

      if (type === 'inlineStr') {
        value = [...cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join('');
      } else {
        const v = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] || '';
        value = type === 's' ? (sharedStrings[Number(v)] || '') : v;
      }

      parsedCells.push({ idx, type, styleIndex, value: decodeXmlEntities(value.trim()) });
    }

    const row: string[] = [];
    for (const cell of parsedCells) {
      let value = cell.value;
      const numeric = Number(value);
      if (Number.isFinite(numeric) && (dateStyleIndexes.has(cell.styleIndex) || (cell.idx === 0 && numeric > 20000 && numeric < 80000))) {
        value = excelSerialToDateString(numeric) || value;
      }
      row[cell.idx] = value;
    }

    rows.push(row.map((cell) => (cell || '').trim()));
  }

  return rows;
}

function parseXlsxRecords(raw: ArrayBuffer) {
  const entries = unzipEntries(raw);
  const workbookXml = entries.get('xl/workbook.xml');
  if (!workbookXml) {
    throw createError({ statusCode: 400, statusMessage: '无法读取 workbook.xml' });
  }

  const relsXml = entries.get('xl/_rels/workbook.xml.rels');
  if (!relsXml) {
    throw createError({ statusCode: 400, statusMessage: '无法读取 workbook 关联关系' });
  }

  const decoder = new TextDecoder('utf-8');
  const workbookText = decoder.decode(workbookXml);
  const relsText = decoder.decode(relsXml);

  const firstSheetRelationshipId = workbookText.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (!firstSheetRelationshipId) {
    throw createError({ statusCode: 400, statusMessage: 'XLSX 中未找到工作表' });
  }

  const target = relsText.match(new RegExp(`<Relationship\\b[^>]*Id="${firstSheetRelationshipId}"[^>]*Target="([^"]+)"`))?.[1];
  if (!target) {
    throw createError({ statusCode: 400, statusMessage: '无法定位第一个工作表' });
  }

  const normalizedTarget = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const sheetXml = entries.get(normalizedTarget);
  if (!sheetXml) {
    throw createError({ statusCode: 400, statusMessage: '无法读取第一个工作表' });
  }

  const sharedXml = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedXml ? parseSharedStrings(decoder.decode(sharedXml)) : [];
  const stylesXml = entries.get('xl/styles.xml');
  const dateStyleIndexes = stylesXml ? parseDateStyleIndexes(decoder.decode(stylesXml)) : new Set<number>();
  const rows = parseSheetRows(decoder.decode(sheetXml), sharedStrings, dateStyleIndexes);

  if (rows.length <= 1) {
    throw createError({ statusCode: 400, statusMessage: 'Excel 内容为空' });
  }

  return rows.slice(1).map((cells) => {
    const [date = '', p1Name = '', s1Text = '', s2Text = '', p2Name = '', winner = '', group = ''] = cells;
    const source = cells.join(',');
    return {
      date,
      p1Name,
      s1Text,
      s2Text,
      p2Name,
      winner,
      group,
      source,
    };
  }).filter((record) => record.source.length > 0);
}

async function parseImportRecords(file: File): Promise<ImportRecord[]> {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.csv') || file.type.includes('csv')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return parseCsvRecords(decodeBestEffort(bytes));
  }

  if (filename.endsWith('.xlsx') || filename.endsWith('.xlsm')) {
    return parseXlsxRecords(await file.arrayBuffer());
  }

  if (filename.endsWith('.xls')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return parseTabularTextRecords(decodeBestEffort(bytes));
  }

  throw createError({ statusCode: 400, statusMessage: '仅支持 CSV、XLS、XLSX、XLSM 文件' });
}

/**
 * 上传表格并按日期、选手、双方得分、胜方、组别字段批量导入比赛记录。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const db = useDb(event);
  const state = await loadState(event);
  const formData = await readFormData(event);

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw createError({ statusCode: 400, statusMessage: '请上传文件' });
  }

  const records = await parseImportRecords(file);
  if (!records.length) {
    throw createError({ statusCode: 400, statusMessage: '导入内容为空' });
  }

  const playersByName = new Map(state.players.map((p) => [p.name, p]));
  const validGroups = new Set(state.groups);
  let importedCount = 0;

  const findPlayerByName = (name: string) => {
    const normalizedName = name.trim().toLowerCase();
    for (const [playerName, player] of playersByName.entries()) {
      if (playerName.trim().toLowerCase() === normalizedName) {
        return player;
      }
    }
    return null;
  };

  for (const record of records) {
    const { date, p1Name, s1Text, s2Text, p2Name, winner: _winner, group, source } = record;
    const normalizedDate = normalizeDateValue(date);
    if (!normalizedDate || !p1Name || !p2Name || !s1Text || !s2Text || !group) {
      throw createError({ statusCode: 400, statusMessage: `字段不完整：${source}` });
    }

    if (!validGroups.has(group)) {
      throw createError({ statusCode: 400, statusMessage: `组别不存在：${group}` });
    }

    const ensurePlayerInGroup = async (playerName: string) => {
      const existingPlayer = findPlayerByName(playerName);
      if (!existingPlayer) {
        const inserted = await db.insert(players).values({
          name: playerName,
          groups: [group],
          createdAt: new Date(),
        }).returning({ id: players.id });

        const newPlayer = { id: inserted[0].id, name: playerName, groups: [group] };
        playersByName.set(playerName, newPlayer);
        return newPlayer;
      }

      if (!existingPlayer.groups.includes(group)) {
        const nextGroups = [...existingPlayer.groups, group];
        await db.update(players).set({ groups: nextGroups }).where(sql`${players.id} = ${existingPlayer.id}`);
        existingPlayer.groups = nextGroups;
      }

      return existingPlayer;
    };

    const p1 = await ensurePlayerInGroup(p1Name);
    const p2 = await ensurePlayerInGroup(p2Name);

    const s1 = Number(s1Text);
    const s2 = Number(s2Text);
    if (Number.isNaN(s1) || Number.isNaN(s2)) {
      throw createError({ statusCode: 400, statusMessage: `比分格式错误：${s1Text},${s2Text}` });
    }
    await db.insert(matches).values({
      date: normalizedDate,
      group,
      p1Id: p1.id,
      p2Id: p2.id,
      s1,
      s2,
      createdAt: new Date(),
    });
    importedCount += 1;
  }

  return `上传成功，导入 ${importedCount} 条记录`;
});
