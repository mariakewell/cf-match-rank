import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// 配置表：存放全局配置（标题、公告、背景）与组别列表。
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// 球员表：记录球员基础信息与所属组别。
export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  groups: text('groups', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(new Date()),
}, (table) => ({
  nameIdx: index('name_idx').on(table.name),
}));

// 比赛表：记录比赛对阵与比分数据。
export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // 日期格式：年-月-日
  group: text('group').notNull(),
  p1Id: integer('p1_id').notNull().references(() => players.id),
  p2Id: integer('p2_id').notNull().references(() => players.id),
  s1: integer('s1').notNull(),
  s2: integer('s2').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(new Date()),
}, (table) => ({
  groupIdx: index('group_idx').on(table.group),
  dateIdx: index('date_idx').on(table.date),
  p1Idx: index('p1_idx').on(table.p1Id),
  p2Idx: index('p2_idx').on(table.p2Id),
}));

// 数据库推导类型，供业务代码复用。
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
