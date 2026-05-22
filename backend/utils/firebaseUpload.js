import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import path from "path";
import { firebaseBucket, isFirebaseReady } from "../config/firebase.js";

const buildPublicUrl = (bucketName, destination) => {
  const encodedPath = destination
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
};

export const uploadFileToFirebase = async (file, { folder = "uploads" } = {}) => {
  if (!file) {
    console.warn("⚠️  uploadFileToFirebase: No file provided");
    return "";
  }

  console.log("📤 uploadFileToFirebase called with:", {
    hasBuffer: !!file.buffer,
    hasPath: !!file.path,
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
  });

  if (!isFirebaseReady || !firebaseBucket) {
    console.warn("⚠️  Firebase not ready/configured:", {
      isFirebaseReady,
      hasBucket: !!firebaseBucket,
    });
    if (file?.path) {
      const fileName = path.basename(file.path);
      const fallbackPath = `/uploads/${fileName}`;
      console.log("📁 Using FALLBACK local path:", fallbackPath);
      return fallbackPath;
    }
    console.warn("⚠️  No file.path available, returning empty string");
    return "";
  }

  const extension = path.extname(file.originalname || file.path || "") || "";
  const safeFolder = String(folder || "uploads").replace(/^\/+|\/+$/g, "");
  const destination = `${safeFolder}/${Date.now()}-${randomUUID()}${extension}`;
  
  console.log("📤 Firebase upload started:", {
    folder: safeFolder,
    destination,
    mimetype: file.mimetype,
    size: file?.buffer?.length || file?.size,
  });

  const uploadOptions = {
    destination,
    metadata: {
      contentType: file.mimetype || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
    },
  };

  if (file.buffer) {
    console.log("📤 Uploading from buffer...");
    try {
      const cloudFile = firebaseBucket.file(destination);
      await cloudFile.save(file.buffer, uploadOptions);
      await cloudFile.makePublic();
      const publicUrl = buildPublicUrl(firebaseBucket.name, destination);
      console.log("✅ Firebase upload successful:", publicUrl.substring(0, 100));
      return publicUrl;
    } catch (bufferUploadError) {
      console.error("❌ Buffer upload failed:", bufferUploadError.message);
      throw bufferUploadError;
    }
  }

  if (file.path) {
    console.log("📤 Uploading from file path...");
    try {
      await firebaseBucket.upload(file.path, uploadOptions);
      const cloudFile = firebaseBucket.file(destination);
      await cloudFile.makePublic();

      try {
        await unlink(file.path);
      } catch {
        // ignore temp file cleanup errors
      }

      const publicUrl = buildPublicUrl(firebaseBucket.name, destination);
      console.log("✅ Firebase upload successful:", publicUrl.substring(0, 100));
      return publicUrl;
    } catch (pathUploadError) {
      console.error("❌ File path upload failed:", pathUploadError.message);
      throw pathUploadError;
    }
  }

  console.error("❌ Invalid file payload: no buffer or path");
  throw new Error("Invalid file payload for Firebase upload");
};
