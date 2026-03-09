import express from "express";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    message: "File uploaded successfully",
    fileUrl: req.file.path
  });
});

export default router;