const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = async (req, res) => {
  const data = await prisma.announcement.findMany({
    include: { author: { select: { name: true, rollNo: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(data);
};

exports.create = async (req, res) => {
  const { title, content } = req.body;

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      authorId: req.user.id
    }
  });

  res.json(announcement);
};

exports.remove = async (req, res) => {
  await prisma.announcement.delete({
    where: { id: Number(req.params.id) }
  });
  res.json({ success: true });
};
