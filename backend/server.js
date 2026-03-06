const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

// ✅ IMPORTANT: auth is a DEFAULT export
const auth = require("./middleware/auth");

// roles are NAMED exports
const { isAdmin, isElevated } = require("./middleware/roles");

const app = express();
const prisma = new PrismaClient();

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());

// ---------------- AUTH ROUTES ----------------
app.use("/api/auth", authRoutes);

// ---------------- ANNOUNCEMENTS ----------------
app.get("/api/announcements", auth, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: {
        author: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.post("/api/announcements", auth, isElevated, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        authorId: req.user.id,
      },
    });
    res.json(announcement);
   } catch (err) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// ---------------- ASSIGNMENTS ----------------
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
  const { subject, title, description, deadline } = req.body;
  if (!subject || !title || !deadline) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const assignment = await prisma.assignment.create({
      data: {
        subject,
        title,
        description,
        deadline: new Date(deadline),
        creatorId: req.user.id,
      },
    });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// ---------------- ADMIN ----------------
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

// ---------------- USERS ----------------
app.get("/api/users", auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        rollNo: true,
        role: true,
        isVerified: true,
      },
      orderBy: { rollNo: "asc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ---------------- HEALTH ----------------
app.get("/", (req, res) => {
  res.json({ status: "InteractED backend running" });
});

// ---------------- SERVER ----------------
const PORT = process.env.PORT || 5000;

// Add this right before app.listen
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 InteractED running on port ${PORT}`);
});
