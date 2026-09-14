// backend/middleware/upload.js
//
// Strategy:
//   • Images  (jpeg, png, gif, webp) → Cloudinary  (transformations, fast CDN)
//   • Everything else (pdf, docx …)  → Google Drive (no bandwidth credits burned)
//
// Both paths use multer with memoryStorage so we control where bytes go.

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { uploadToDrive } = require("../config/googleDrive");

// ── Multer: keep file in memory, we'll forward it ourselves ──────
const memStorage = multer.memoryStorage();

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream", // fallback when mobile doesn't send correct mime
];

const multerUpload = multer({
  storage: memStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB hard cap
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// ── Helpers ───────────────────────────────────────────────────────
const isImage = (mimeType) => mimeType.startsWith("image/");

// Check mime type OR file extension — mobile apps often send wrong mime
const isPDF = (mimeType, originalname) =>
  mimeType === "application/pdf" ||
  (originalname && originalname.toLowerCase().endsWith(".pdf"));

const isDOCX = (mimeType, originalname) =>
  mimeType === "application/msword" ||
  mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  (originalname && (
    originalname.toLowerCase().endsWith(".doc") ||
    originalname.toLowerCase().endsWith(".docx")
  ));

// ── Main middleware: parse → route → attach result to req.uploadResult ──
function smartUpload(fieldName) {
  return [
    // Step 1: multer parses the multipart body into req.file
    multerUpload.single(fieldName),

    // Step 2: forward to the right storage backend
    async (req, res, next) => {
      if (!req.file) return next(); // let the route handler report "no file"

      const { mimetype, originalname } = req.file;
      console.log("FILE MIME:", mimetype, "| NAME:", originalname); // debug log

      try {
        if (isImage(mimetype) && !isPDF(mimetype, originalname) && !isDOCX(mimetype, originalname)) {
          // ── Cloudinary path ──────────────────────────────────────
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: "interacted_uploads/images",
                resource_type: "image",
              },
              (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(req.file.buffer);
          });

          req.uploadResult = {
            provider: "cloudinary",
            fileUrl: result.secure_url,
            fileName: originalname,
          };
        } else {
          // ── Google Drive path (PDFs, DOCX, anything else) ────────
          const { viewUrl, downloadUrl, fileId } = await uploadToDrive(
            req.file.buffer,
            originalname,
            mimetype === "application/octet-stream" ? "application/pdf" : mimetype
          );

          req.uploadResult = {
            provider: "google_drive",
            fileUrl: viewUrl,          // store the viewer link in DB
            downloadUrl,               // handy if you also want to store it
            fileId,                    // store this so you can delete later
            fileName: originalname,
          };
        }

        next();
      } catch (err) {
        console.error("Upload routing error:", err);
        res.status(500).json({ error: "File upload failed", detail: err.message });
      }
    },
  ];
}

module.exports = { smartUpload };