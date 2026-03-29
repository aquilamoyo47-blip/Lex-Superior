import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vaultFilesTable, bookmarksTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
import { parsePDFBase64, isPDFBuffer, cleanExtractedText } from "../vendor/pdf-parser.js";
import { fuzzySearch } from "../vendor/fuzzy-search.js";
import { generateExcerpt } from "../vendor/text-utils.js";

const router: IRouter = Router();

router.get("/vault/files", async (req, res) => {
  const { userId, folder, search } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (userId) conditions.push(eq(vaultFilesTable.userId, userId));
    if (folder) conditions.push(eq(vaultFilesTable.folder, folder));

    const files = await db
      .select()
      .from(vaultFilesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(vaultFilesTable.createdAt)
      .limit(500);

    if (search && search.trim().length >= 2) {
      const results = fuzzySearch(files, search, {
        keys: ['name', 'notes', 'content'],
        threshold: 0.45,
        limit: 200,
      });
      const fuzzyFiles = results.map(r => r.item);
      const storageUsed = fuzzyFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0);
      res.json({ files: fuzzyFiles, total: fuzzyFiles.length, storageUsed, fuzzySearch: true });
    } else {
      const limited = files.slice(0, 200);
      const storageUsed = limited.reduce((acc, f) => acc + (f.fileSize || 0), 0);
      res.json({ files: limited, total: limited.length, storageUsed, fuzzySearch: false });
    }
  } catch (err) {
    req.log.error({ err }, "List vault files error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/vault/files", async (req, res) => {
  const { userId, name, filePath, fileType, fileSize, folder = "root", tags, notes, consultationId, content, pdfBase64 } = req.body;

  if (!name || !filePath) {
    res.status(400).json({ error: "Bad Request", message: "name and filePath are required" });
    return;
  }

  let extractedContent = content || null;
  let parsedMetadata: Record<string, unknown> | null = null;

  if (pdfBase64 && (fileType?.includes('pdf') || name.toLowerCase().endsWith('.pdf'))) {
    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      if (isPDFBuffer(pdfBuffer)) {
        const parsed = await parsePDFBase64(pdfBase64);
        extractedContent = cleanExtractedText(parsed.text);
        parsedMetadata = {
          pages: parsed.pages,
          wordCount: parsed.wordCount,
          characterCount: parsed.characterCount,
          title: parsed.metadata.title,
          author: parsed.metadata.author,
          excerpt: generateExcerpt(extractedContent, 300),
        };
      }
    } catch (pdfErr) {
      req.log.warn({ pdfErr, name }, 'PDF parsing failed, saving without extracted text');
    }
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
      notes: parsedMetadata ? `${notes || ''}\n[PDF Metadata: ${JSON.stringify(parsedMetadata)}]`.trim() : notes,
      consultationId,
      content: extractedContent,
    }).returning();

    res.status(201).json({ ...file, pdfMetadata: parsedMetadata });
  } catch (err) {
    req.log.error({ err }, "Save vault file error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/vault/files/parse-pdf", async (req, res) => {
  const { pdfBase64, name } = req.body;

  if (!pdfBase64) {
    res.status(400).json({ error: "Bad Request", message: "pdfBase64 is required" });
    return;
  }

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (!isPDFBuffer(pdfBuffer)) {
      res.status(400).json({ error: "Bad Request", message: "Provided data is not a valid PDF" });
      return;
    }

    const parsed = await parsePDFBase64(pdfBase64);
    const cleanedText = cleanExtractedText(parsed.text);

    res.json({
      text: cleanedText,
      pages: parsed.pages,
      wordCount: parsed.wordCount,
      characterCount: parsed.characterCount,
      metadata: parsed.metadata,
      excerpt: generateExcerpt(cleanedText, 500),
      name: name || 'document.pdf',
    });
  } catch (err) {
    req.log.error({ err }, "PDF parse error");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to parse PDF" });
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
