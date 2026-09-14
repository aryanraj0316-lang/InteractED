// routes/users.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/users  —  used by the chat "New Chat" modal to list all peers
router.get('/', protect, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, rollNo: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;