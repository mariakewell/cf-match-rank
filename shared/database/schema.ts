import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// --- Tables ---

// Used for global config (title, notice, background) AND global groups list
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  groups: text('groups', { mode: 'json' }).$type<string[]>().notNull(), 
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(new Date()),
}, (table) => ({
  nameIdx: index('name_idx').on(table.name),
}));

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // ISO Date String YYYY-MM-DD
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

// --- Types ---
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;