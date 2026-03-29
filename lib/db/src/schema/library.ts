import { pgTable, text, uuid, integer, date, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const statutesTable = pgTable("statutes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  chapter: text("chapter"),
  category: text("category").notNull(),
  sections: jsonb("sections"),
  summary: text("summary"),
  lastUpdated: date("last_updated"),
  tags: text("tags").array().default([]),
});

export const casesTable = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  citation: text("citation").notNull().unique(),
  title: text("title").notNull(),
  court: text("court").notNull(),
  year: integer("year"),
  subjectTags: text("subject_tags").array().default([]),
  principle: text("principle"),
  headnote: text("headnote"),
  statutesApplied: text("statutes_applied").array().default([]),
  fullTextUrl: text("full_text_url"),
});

export const notesTable = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  unit: integer("unit"),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  keyCases: text("key_cases").array().default([]),
  keyRules: text("key_rules").array().default([]),
  tags: text("tags").array().default([]),
});

export const updatesTable = pgTable("legal_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  summary: text("summary").notNull(),
  date: date("date").notNull(),
  importance: text("importance").notNull().default("medium"),
});

export const precedentsTable = pgTable("precedents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull().default("Palmer Law Firm"),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fullText: text("full_text").notNull(),
  excerpt: text("excerpt"),
  wordCount: integer("word_count"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
});

export const insertPrecedentSchema = createInsertSchema(precedentsTable).omit({ id: true });

export const insertStatuteSchema = createInsertSchema(statutesTable).omit({ id: true });
export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true });
export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true });
export const insertUpdateSchema = createInsertSchema(updatesTable).omit({ id: true });

export type InsertStatute = z.infer<typeof insertStatuteSchema>;
export type Statute = typeof statutesTable.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type LegalCase = typeof casesTable.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;
export type InsertUpdate = z.infer<typeof insertUpdateSchema>;
export type LegalUpdate = typeof updatesTable.$inferSelect;
export type InsertPrecedent = z.infer<typeof insertPrecedentSchema>;
export type Precedent = typeof precedentsTable.$inferSelect;
