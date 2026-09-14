// backend/config/googleDrive.js
const { google } = require("googleapis");
const { Readable } = require("stream");

// ── OAuth2 Auth (uses YOUR personal Google account) ───────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

/**
 * Upload a file buffer to Google Drive.
 */
async function uploadToDrive(buffer, originalName, mimeType) {
  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: originalName,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, name, webViewLink, webContentLink",
  });

  const file = response.data;

  // Make publicly readable so students don't need to log in
  await drive.permissions.create({
    fileId: file.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId: file.id,
    viewUrl: file.webViewLink,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
  };
}

/**
 * Delete a file from Google Drive by its fileId.
 */
async function deleteFromDrive(fileId) {
  await drive.files.delete({ fileId });
}

module.exports = { uploadToDrive, deleteFromDrive };