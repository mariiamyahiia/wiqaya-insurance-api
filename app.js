import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
const app = express();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIR = path.resolve("private/claim-photos");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG images are allowed."));
    }
    cb(null, true);
  },
});
app.post(
  "/api/v1/claims/:claimId/photos",
  authenticateUser,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { claimId } = req.params;
      if (!req.file) {
        return res.status(400).json({
          error: "A claim photo is required.",
        });
      }
      // Verify the user is authorized to access this claim.
      const claim = await findClaimById(claimId);
      if (!claim) {
        await fs.unlink(req.file.path);
        return res.status(404).json({
          error: "Claim not found.",
        });
      }
      if (!canUploadClaimPhoto(req.user, claim)) {
        await fs.unlink(req.file.path);
        return res.status(403).json({
          error: "You are not authorized to upload photos for this claim.",
        });
      }
      // Persist the photo metadata in the claims database.
      const photo = await saveClaimPhoto({
        claimId,
        storageKey: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.id,
      });
      return res.status(201).json({
        message: "Claim photo uploaded successfully.",
        photo: {
          id: photo.id,
          claimId,
          contentType: photo.mimeType,
          size: photo.size,
          uploadedAt: photo.uploadedAt,
        },
      });
    } catch (error) {
      console.error("Claim photo upload failed:", error);
      return res.status(500).json({
        error: "Unable to process the claim photo.",
      });
    }
  }
);
// Replace these placeholders with your actual authentication,
// claims database, and authorization implementations.
async function authenticateUser(req, res, next) {
  // Authenticate the request and populate req.user.
  next();
}
async function findClaimById(claimId) {
  // Retrieve the claim from your database.
}
function canUploadClaimPhoto(user, claim) {
  // Check claim ownership or claims-team permissions.
  return false;
}
async function saveClaimPhoto(metadata) {
  // Insert metadata into your database.
}
app.listen(3000, () => {
  console.log("Wiqaya claims API running on port 3000");
});