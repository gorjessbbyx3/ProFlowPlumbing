import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bookingPhotosTable, bookingsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve(__dirname, "../../../uploads/photos");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

const router: IRouter = Router();

router.get("/bookings/:id/photos", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const photos = await db.select().from(bookingPhotosTable).where(eq(bookingPhotosTable.bookingId, bookingId));
  res.json(photos);
});

router.post("/bookings/:id/photos", upload.single("photo"), async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (!req.file) { res.status(400).json({ error: "No photo uploaded" }); return; }

  const photoType = req.body.type;
  if (!photoType || !["before", "after"].includes(photoType)) {
    res.status(400).json({ error: "type must be before or after" });
    return;
  }

  const filePath = "/uploads/photos/" + req.file.filename;
  const [photo] = await db.insert(bookingPhotosTable).values({
    bookingId,
    type: photoType,
    filePath,
    caption: req.body.caption || null,
  }).returning();

  res.status(201).json(photo);
});

router.delete("/bookings/:id/photos/:photoId", async (req, res): Promise<void> => {
  const photoId = Number(req.params.photoId);
  if (isNaN(photoId)) { res.status(400).json({ error: "Invalid photo ID" }); return; }

  const [photo] = await db.delete(bookingPhotosTable).where(eq(bookingPhotosTable.id, photoId)).returning();
  if (!photo) { res.status(404).json({ error: "Photo not found" }); return; }

  // Delete file from disk
  const fullPath = path.resolve(__dirname, "../../..", photo.filePath);
  try { fs.unlinkSync(fullPath); } catch {}

  res.sendStatus(204);
});

export default router;
