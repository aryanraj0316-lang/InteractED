// controllers/submissionController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/assignments/:id/submit
const submit = async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const { fileUrl, fileName } = req.body;

    const sub = await prisma.submission.upsert({
      where: {
        assignmentId_userId: { assignmentId, userId: req.user.id },
      },
      update: { fileUrl, fileName },
      create: { assignmentId, userId: req.user.id, fileUrl, fileName },
      include: {
        user: { select: { id: true, name: true, rollNo: true } },
      },
    });
    res.json(sub);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/assignments/:id/submissions  (CLASS_REP / ADMIN only)
const getSubmissions = async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);

    const [submissions, allStudents] = await Promise.all([
      prisma.submission.findMany({
        where: { assignmentId },
        include: { user: { select: { id: true, name: true, rollNo: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, rollNo: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    res.json({ submissions, allStudents, totalStudents: allStudents.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { submit, getSubmissions };