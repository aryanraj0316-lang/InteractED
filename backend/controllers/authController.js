const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const register = async (req, res) => {
  try {
    const { name, rollNo, password } = req.body;

    if (!name || !rollNo || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { rollNo },
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        rollNo,
        password: hashedPassword,
      },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        rollNo: user.rollNo,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { rollNo, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { rollNo },
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

const me = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, me };
