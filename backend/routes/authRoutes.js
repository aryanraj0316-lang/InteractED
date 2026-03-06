const express = require("express");
const { register, login, me } = require("../controllers/authController");
const auth = require("../middleware/auth");

const router = express.Router();

// Log calls for debugging
router.post("/register", (req, res, next) => {
  console.log("POST /api/auth/register called");
  next();
}, register);

router.post("/login", (req, res, next) => {
  console.log("POST /api/auth/login called");
  next();
}, login);

router.get("/me", auth, me);

module.exports = router;