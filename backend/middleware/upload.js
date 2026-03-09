app.post("/api/files/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res.status(400).json({ error: "Subject required" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `interacted_uploads/${subject}`
    });

    res.json({
      message: "File uploaded successfully",
      fileUrl: result.secure_url,
      subject
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});