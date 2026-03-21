import { pgTable, text, uuid, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vaultFilesTable = pgTable("vault_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  folder: text("folder").notNull().default("root"),
  tags: text("tags").array().default([]),
  starred: boolean("starred").default(false),
  notes: text("notes"),
  consultationId: uuid("consultation_id"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookmarksTable = pgTable("bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  referenceId: text("reference_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVaultFileSchema = createInsertSchema(vaultFilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBookmarkSchema = createInsertSchema(bookmarksTable).omit({ id: true, createdAt: true });

export type InsertVaultFile = z.infer<typeof insertVaultFileSchema>;
export type VaultFile = typeof vaultFilesTable.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarksTable.$inferSelect;
