import multer from "multer";

// Use memory storage for direct upload to Firebase Storage (no local 'uploads' folder created on disk)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
});