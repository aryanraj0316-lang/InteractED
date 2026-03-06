const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const isAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (user?.role === "ADMIN") return next();
  return res.status(403).json({ error: "Admin access only" });
};

const isElevated = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (user && (user.role === "ADMIN" || user.role === "CLASS_REP")) {
    return next();
  }

  return res.status(403).json({ error: "Class rep access only" });
};

module.exports = { isAdmin, isElevated };
