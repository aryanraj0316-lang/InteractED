const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const authRoutes = require("./routes/authRoutes");
const auth = require("./middleware/auth");
const { isAdmin, isElevated } = require("./middleware/roles");

const app = express();
const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "interacted_uploads",
    resource_type: "auto",
  }),
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

// FILE UPLOAD
app.post("/api/files/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    console.log("Uploaded:", req.file.path, "| mime:", req.file.mimetype);
    res.json({ message: "File uploaded successfully", fileUrl: req.file.path });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "File upload failed" });
  }
});

// ANNOUNCEMENTS
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

app.post("/api/announcements", auth, isElevated, async (req, res) => {
  const { title, content, fileUrl } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Missing fields" });
  try {
    const announcement = await prisma.announcement.create({
      data: { title, content, fileUrl, authorId: req.user.id },
    });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// NOTES
app.post("/api/notes", auth, async (req, res) => {
  const { subject, title, description, fileUrl, fileName } = req.body;
  if (!subject || !fileUrl || !fileName)
    return res.status(400).json({ error: "Missing required fields" });
  try {
    const note = await prisma.note.create({
      data: { subject, title: title || fileName, description, fileUrl, fileName, uploaderId: req.user.id },
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

// ASSIGNMENTS
app.get("/api/assignments", auth, async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { deadline: { gte: new Date() } },
      orderBy: { deadline: "asc" },
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

app.post("/api/assignments", auth, isElevated, async (req, res) => {
  const { subject, title, description, deadline, fileUrl } = req.body;
  if (!subject || !title || !deadline)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const assignment = await prisma.assignment.create({
      data: { subject, title, description, deadline: new Date(deadline), fileUrl, creatorId: req.user.id },
    });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// ADMIN
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

// USERS
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

app.get("/", (req, res) => res.json({ status: "InteractED backend running" }));
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log("InteractED running on port " + PORT));