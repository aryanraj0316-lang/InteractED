import { upload, cloudinary } from "./cloudinary-config"; // make sure this exports your multer & cloudinary

app.post("/api/files/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res.status(400).json({ error: "Subject required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Use resource_type: 'auto' to support PDFs, docs, images
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `interacted_uploads/${subject}`,
      resource_type: "auto",
    });

    res.json({
      message: "File uploaded successfully",
      fileUrl: result.secure_url, // ✅ use secure_url
      subject,
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});