// controllers/chatController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROOM_INCLUDE = {
  members: { include: { user: { select: { id: true, name: true, rollNo: true } } } },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { sender: { select: { id: true, name: true } } },
  },
};

// GET /api/chat/rooms
const getRooms = async (req, res) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: ROOM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const enriched = rooms.map(r => ({
      ...r,
      unreadCount: r.messages.filter(m => m.senderId !== req.user.id).length,
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/chat/rooms
const createRoom = async (req, res) => {
  try {
    const { isGroup, name, memberIds } = req.body;
    const allIds = [...new Set([req.user.id, ...memberIds])];

    // For DMs, return existing room if already exists
    if (!isGroup && allIds.length === 2) {
      const existing = await prisma.chatRoom.findFirst({
        where: {
          isGroup: false,
          AND: allIds.map(id => ({ members: { some: { userId: id } } })),
        },
        include: ROOM_INCLUDE,
      });
      if (existing) return res.json(existing);
    }

    const room = await prisma.chatRoom.create({
      data: {
        isGroup: Boolean(isGroup),
        name: isGroup ? name : null,
        members: { create: allIds.map(id => ({ userId: id })) },
      },
      include: ROOM_INCLUDE,
    });
    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/chat/rooms/:id/messages
const getMessages = async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { roomId: Number(req.params.id) },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/chat/rooms/:id/messages
const sendMessage = async (req, res) => {
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
};

module.exports = { getRooms, createRoom, getMessages, sendMessage };