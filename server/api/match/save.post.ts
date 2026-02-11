import { createError, defineEventHandler, readFormData } from 'h3';
import { sql } from 'drizzle-orm';
import { matches } from '~/shared/database/schema';
import { checkAuth } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  checkAuth(event);
  const formData = await readFormData(event);
  const db = useDb(event);

  const id = formData.get('id')?.toString();
  const matchData = {
    date: formData.get('date')?.toString() || new Date().toISOString().split('T')[0],
    group: formData.get('group')?.toString() || '',
    p1Id: Number(formData.get('p1_id')),
    p2Id: Number(formData.get('p2_id')),
    s1: Number(formData.get('s1') || 0),
    s2: Number(formData.get('s2') || 0),
  };

  if (!matchData.group) throw createError({ statusCode: 400, statusMessage: '请选择组别' });
  if (Number.isNaN(matchData.p1Id) || Number.isNaN(matchData.p2Id)) throw createError({ statusCode: 400, statusMessage: '请选择两位选手' });
  if (matchData.p1Id === matchData.p2Id) throw createError({ statusCode: 400, statusMessage: '不能选同一个人' });

  if (id) {
    await db.update(matches).set(matchData).where(sql`${matches.id} = ${Number(id)}`);
  } else {
    await db.insert(matches).values({ ...matchData, createdAt: new Date() });
  }

  return '保存成功';
});
