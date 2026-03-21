import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vaultFilesTable, bookmarksTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/vault/files", async (req, res) => {
  const { userId, folder, search } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (userId) conditions.push(eq(vaultFilesTable.userId, userId));
    if (folder) conditions.push(eq(vaultFilesTable.folder, folder));
    if (search) {
      conditions.push(
        or(
          ilike(vaultFilesTable.name, `%${search}%`),
          ilike(vaultFilesTable.notes, `%${search}%`)
        )!
      );
    }

    const files = await db
      .select()
      .from(vaultFilesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(vaultFilesTable.createdAt)
      .limit(200);

    const storageUsed = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);

    res.json({ files, total: files.length, storageUsed });
  } catch (err) {
    req.log.error({ err }, "List vault files error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/vault/files", async (req, res) => {
  const { userId, name, filePath, fileType, fileSize, folder = "root", tags, notes, consultationId, content } = req.body;

  if (!name || !filePath) {
    res.status(400).json({ error: "Bad Request", message: "name and filePath are required" });
    return;
  }

  try {
    const [file] = await db.insert(vaultFilesTable).values({
      userId: userId || "anonymous",
      name,
      filePath,
      fileType,
      fileSize,
      folder,
      tags: tags || [],
      notes,
      consultationId,
      content,
    }).returning();

    res.status(201).json(file);
  } catch (err) {
    req.log.error({ err }, "Save vault file error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/vault/files/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(vaultFilesTable).where(eq(vaultFilesTable.id, id));
    res.json({ success: true, message: "File deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete vault file error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/vault/bookmarks", async (req, res) => {
  const { userId } = req.query as Record<string, string>;
  try {
    const conditions = userId ? [eq(bookmarksTable.userId, userId)] : [];
    const bookmarks = await db
      .select()
      .from(bookmarksTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(bookmarksTable.createdAt)
      .limit(200);

    res.json({ bookmarks });
  } catch (err) {
    req.log.error({ err }, "List bookmarks error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/vault/bookmarks", async (req, res) => {
  const { userId, type, referenceId, title, notes } = req.body;

  if (!type || !referenceId || !title) {
    res.status(400).json({ error: "Bad Request", message: "type, referenceId and title are required" });
    return;
  }

  try {
    const [bookmark] = await db.insert(bookmarksTable).values({
      userId: userId || "anonymous",
      type,
      referenceId,
      title,
      notes,
    }).returning();

    res.status(201).json(bookmark);
  } catch (err) {
    req.log.error({ err }, "Save bookmark error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
