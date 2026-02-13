import { createError, defineEventHandler, readFormData } from 'h3';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { loadState } from '~/server/utils/state';

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


/**
 * 上传 CSV 并按日期、选手、双方得分、胜方、组别字段批量导入比赛记录。
 */
export default defineEventHandler(async (event) => {
  checkAuth(event);
  const db = useDb(event);
  const state = await loadState(event);
  const formData = await readFormData(event);

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw createError({ statusCode: 400, statusMessage: '请上传 CSV 文件' });
  }

  const raw = await file.text();
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    throw createError({ statusCode: 400, statusMessage: 'CSV 内容为空' });
  }

  const playersByName = new Map(state.players.map((p) => [p.name, p]));
  const validGroups = new Set(state.groups);
  let importedCount = 0;

  for (const line of lines.slice(1)) {
    const [date, p1Name, s1Text, s2Text, p2Name, _winner, group] = parseCsvLine(line);
    if (!date || !p1Name || !p2Name || !s1Text || !s2Text || !group) {
      throw createError({ statusCode: 400, statusMessage: `CSV 字段不完整：${line}` });
    }

    if (!validGroups.has(group)) {
      throw createError({ statusCode: 400, statusMessage: `组别不存在：${group}` });
    }

    const p1 = playersByName.get(p1Name);
    const p2 = playersByName.get(p2Name);
    if (!p1 || !p2) {
      throw createError({ statusCode: 400, statusMessage: `未找到球员：${!p1 ? p1Name : p2Name}` });
    }

    if (!p1.groups.includes(group) || !p2.groups.includes(group)) {
      throw createError({ statusCode: 400, statusMessage: `球员与组别不匹配：${p1Name} vs ${p2Name} / ${group}` });
    }

    const s1 = Number(s1Text);
    const s2 = Number(s2Text);
    if (Number.isNaN(s1) || Number.isNaN(s2)) {
      throw createError({ statusCode: 400, statusMessage: `比分格式错误：${s1Text},${s2Text}` });
    }
    await db.insert(matches).values({
      date,
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
