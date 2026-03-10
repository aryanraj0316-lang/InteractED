// controllers/scheduleController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/schedule
const getAll = async (req, res) => {
  try {
    const events = await prisma.scheduleEvent.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'asc' },
    });
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/schedule
const create = async (req, res) => {
  try {
    const { title, subject, type, date } = req.body;
    const event = await prisma.scheduleEvent.create({
      data: {
        title,
        subject: subject || null,
        type: type || 'OTHER',
        date: new Date(date),
        userId: req.user.id,
      },
    });
    res.json(event);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/schedule/:id
const remove = async (req, res) => {
  try {
    await prisma.scheduleEvent.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getAll, create, remove };