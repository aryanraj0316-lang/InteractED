const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const { v2: cloudinary } = require("cloudinary");
const { smartUpload } = require("./middleware/upload");

const authRoutes = require("./routes/authRoutes");
const auth = require("./middleware/auth");
const { isAdmin, isElevated } = require("./middleware/roles");

const app = express();
const prisma = new PrismaClient();

// ── Cloudinary config (images only now) ──────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(express.json());

// ── Auth ──────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ── FILE UPLOAD ───────────────────────────────────────────────────
// smartUpload automatically routes:
//   images  (jpg/png/gif/webp) → Cloudinary
//   PDFs / DOCX               → Google Drive
app.post(
  "/api/files/upload",
  auth,
  ...smartUpload("file"),          // spread because smartUpload returns [multer, async]
  async (req, res) => {
    try {
      if (!req.uploadResult) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { provider, fileUrl, downloadUrl, fileId, fileName } = req.uploadResult;

      console.log(`Uploaded via ${provider}: ${fileName} → ${fileUrl}`);

      res.json({
        message: "File uploaded successfully",
        fileUrl,
        downloadUrl: downloadUrl || fileUrl, // Cloudinary URLs are direct already
        fileId: fileId || null,
        fileName,
        provider,
      });
    } catch (err) {
      console.error("Upload handler error:", err);
      res.status(500).json({ error: "File upload failed" });
    }
  }
);

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────
app.get("/api/announcements", auth, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { author: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.post("/api/announcements", auth, async (req, res) => {
  const { title, content, category, fileUrl } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Missing fields" });
  try {
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        category: category || "INFO",
        fileUrl,
        authorId: req.user.id,
      },
      include: { author: { select: { name: true, role: true } } },
    });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

app.delete("/api/announcements/:id", auth, isElevated, async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// ── NOTES ─────────────────────────────────────────────────────────
app.post("/api/notes", auth, async (req, res) => {
  const { subject, title, description, fileUrl, fileName } = req.body;
  if (!subject || !fileUrl || !fileName)
    return res.status(400).json({ error: "Missing required fields" });
  try {
    const note = await prisma.note.create({
      data: {
        subject,
        title: title || fileName,
        description,
        fileUrl,
        fileName,
        uploaderId: req.user.id,
      },
    });
    res.json(note);
  } catch (err) {
    console.error("Failed to create note:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.get("/api/notes", auth, async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      include: { uploader: { select: { name: true, rollNo: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(notes);
  } catch (error) {
    console.error("Notes error:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// ── ASSIGNMENTS ───────────────────────────────────────────────────
app.get("/api/assignments", auth, async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { deadline: { gte: new Date() } },
      orderBy: { deadline: "asc" },
      include: {
        submissions: {
          where: { userId: req.user.id },
          select: { id: true, fileUrl: true, fileName: true },
        },
      },
    });
    const shaped = assignments.map((a) => ({
      ...a,
      mySubmission: a.submissions?.[0] || null,
      submissions: undefined,
    }));
    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

app.post("/api/assignments", auth, isElevated, async (req, res) => {
  const { subject, title, description, deadline, priority, fileUrl } = req.body;
  if (!subject || !title || !deadline)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const assignment = await prisma.assignment.create({
      data: {
        subject,
        title,
        description,
        deadline: new Date(deadline),
        priority: priority || "MEDIUM",
        fileUrl,
        creatorId: req.user.id,
      },
    });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

app.delete("/api/assignments/:id", auth, isElevated, async (req, res) => {
  try {
    await prisma.assignment.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// ── ASSIGNMENT SUBMISSIONS ────────────────────────────────────────
app.post("/api/assignments/:id/submit", auth, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const { fileUrl, fileName } = req.body;
    const sub = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId, userId: req.user.id } },
      update: { fileUrl, fileName, completed: true },
      create: { assignmentId, userId: req.user.id, fileUrl, fileName, completed: true },
      include: { user: { select: { id: true, name: true, rollNo: true } } },
    });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/assignments/:id/submissions", auth, isElevated, async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const [submissions, allStudents] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { assignmentId },
        include: { user: { select: { id: true, name: true, rollNo: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, rollNo: true },
        orderBy: { name: "asc" },
      }),
    ]);
    res.json({ submissions, allStudents, totalStudents: allStudents.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXAMS ─────────────────────────────────────────────────────────
app.get("/api/exams", auth, async (req, res) => {
  res.json([]);
});

// ── CHAT ──────────────────────────────────────────────────────────
const ROOM_INCLUDE = {
  members: {
    include: { user: { select: { id: true, name: true, rollNo: true } } },
  },
  messages: {
    orderBy: { createdAt: "desc" },
    take: 1,
    include: { sender: { select: { id: true, name: true } } },
  },
};

app.get("/api/chat/rooms", auth, async (req, res) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: ROOM_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    const enriched = rooms.map((r) => ({
      ...r,
      unreadCount: r.messages.filter((m) => m.senderId !== req.user.id).length,
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/chat/rooms", auth, async (req, res) => {
  try {
    const { isGroup, name, memberIds } = req.body;
    const allIds = [...new Set([req.user.id, ...memberIds])];

    if (!isGroup && allIds.length === 2) {
      const existing = await prisma.chatRoom.findFirst({
        where: {
          isGroup: false,
          AND: allIds.map((id) => ({ members: { some: { userId: id } } })),
        },
        include: ROOM_INCLUDE,
      });
      if (existing) return res.json(existing);
    }

    const room = await prisma.chatRoom.create({
      data: {
        isGroup: Boolean(isGroup),
        name: isGroup ? name : null,
        members: { create: allIds.map((id) => ({ userId: id })) },
      },
      include: ROOM_INCLUDE,
    });
    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/chat/rooms/:id/messages", auth, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { roomId: Number(req.params.id) },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/chat/rooms/:id/messages", auth, async (req, res) => {
  try {
    const msg = await prisma.message.create({
      data: {
        roomId: Number(req.params.id),
        senderId: req.user.id,
        content: req.body.content,
      },
      include: { sender: { select: { id: true, name: true } } },
    });
    res.json(msg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN ─────────────────────────────────────────────────────────
app.patch("/api/admin/promote/:id", auth, isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { role: "CLASS_REP", isVerified: true },
    });
    res.json({ message: "User promoted", user });
  } catch (err) {
    res.status(500).json({ error: "Promotion failed" });
  }
});

// ── USERS ─────────────────────────────────────────────────────────
app.get("/api/users", auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, rollNo: true, role: true, isVerified: true },
      orderBy: { rollNo: "asc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── SCHEDULE ──────────────────────────────────────────────────────
app.get("/api/schedule", auth, async (req, res) => {
  try {
    const events = await prisma.scheduleEvent.findMany({
      where: { userId: req.user.id },
      orderBy: { date: "asc" },
    });
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/schedule", auth, async (req, res) => {
  try {
    const { title, subject, type, date } = req.body;
    if (!title || !date)
      return res.status(400).json({ error: "title and date are required" });
    const event = await prisma.scheduleEvent.create({
      data: {
        title,
        subject: subject || null,
        type: type || "OTHER",
        date: new Date(date),
        userId: req.user.id,
      },
    });
    res.json(event);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/schedule/:id", auth, async (req, res) => {
  try {
    await prisma.scheduleEvent.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health & 404 ──────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "InteractED backend running" }));
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log("InteractED running on port " + PORT)
);