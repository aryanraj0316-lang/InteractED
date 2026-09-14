// controllers/announcementController.js  (REPLACE your existing file with this)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/announcements
const getAll = async (req, res) => {
  try {
    const data = await prisma.announcement.findMany({
      include: {
        author: { select: { name: true, role: true, rollNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/announcements  (any authenticated user can post; restrict by role on frontend)
const create = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        category: category || 'INFO',
        authorId: req.user.id,
      },
      include: {
        author: { select: { name: true, role: true, rollNo: true } },
      },
    });
    res.json(announcement);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/announcements/:id  (CLASS_REP / ADMIN only — enforced by route middleware)
const remove = async (req, res) => {
  try {
    await prisma.announcement.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getAll, create, remove };