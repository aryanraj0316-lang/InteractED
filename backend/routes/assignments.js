// routes/assignments.js  (REPLACE your existing file with this)

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isElevated } = require('../middleware/roles');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { submit, getSubmissions } = require('../controllers/submissionController');

// GET /api/assignments
router.get('/', protect, async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      orderBy: { deadline: 'asc' },
      include: {
        submissions: {
          where: { userId: req.user.id },
          select: { id: true, fileUrl: true, fileName: true, createdAt: true },
        },
      },
    });
    // Rename submissions → mySubmission for the frontend
    const shaped = assignments.map(a => ({
      ...a,
      mySubmission: a.submissions?.[0] || null,
      submissions: undefined,
    }));
    res.json(shaped);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/assignments  (CLASS_REP / ADMIN only)
router.post('/', protect, isElevated, async (req, res) => {
  try {
    const { title, subject, description, priority, deadline } = req.body;
    if (!title || !subject || !deadline) {
      return res.status(400).json({ error: 'title, subject and deadline are required' });
    }
    const assignment = await prisma.assignment.create({
      data: {
        title,
        subject,
        description: description || null,
        priority: priority || 'MEDIUM',
        deadline: new Date(deadline),
      },
    });
    res.json(assignment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/assignments/:id/submit  (any student)
router.post('/:id/submit', protect, submit);

// GET /api/assignments/:id/submissions  (CLASS_REP / ADMIN only)
router.get('/:id/submissions', protect, isElevated, getSubmissions);

// DELETE /api/assignments/:id  (CLASS_REP / ADMIN only)
router.delete('/:id', protect, isElevated, async (req, res) => {
  try {
    await prisma.assignment.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;