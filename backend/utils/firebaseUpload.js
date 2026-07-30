import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import fs from "fs";
import path from "path";
import { firebaseBucket, isFirebaseReady } from "../config/firebase.js";

const buildPublicUrl = (bucketName, destination) => {
  const encodedPath = destination
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
};

const saveBufferLocally = (file, folder = "uploads") => {
  try {
    const safeFolder = String(folder || "uploads").replace(/^\/+|\/+$/g, "");
    const uploadDir = path.join(process.cwd(), "uploads", safeFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = path.extname(file.originalname || file.path || "") || ".png";
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    const backendHost = process.env.BACKEND_URL || "http://localhost:8000";
    const relativeUrl = `${backendHost.replace(/\/+$/, "")}/uploads/${safeFolder}/${filename}`;
    console.log("📁 Saved file buffer to local disk fallback:", relativeUrl);
    return relativeUrl;
  } catch (err) {
    console.error("❌ Failed to save buffer locally:", err.message);
    if (file.buffer && file.mimetype) {
      return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    }
    return "";
  }
};

export const uploadFileToFirebase = async (file, { folder = "uploads" } = {}) => {
  if (!file) {
    console.warn("⚠️  uploadFileToFirebase: No file provided");
    return "";
  }

  const safeFolder = String(folder || "uploads").replace(/^\/+|\/+$/g, "");

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
    if (file.buffer) {
      return saveBufferLocally(file, safeFolder);
    }
    if (file?.path) {
      const fileName = path.basename(file.path);
      const fallbackPath = `/uploads/${fileName}`;
      console.log("📁 Using FALLBACK local path:", fallbackPath);
      return fallbackPath;
    }
    console.warn("⚠️  No file buffer or path available, returning empty string");
    return "";
  }

  const extension = path.extname(file.originalname || file.path || "") || "";
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
      try {
        await cloudFile.makePublic();
      } catch (aclErr) {
        console.warn("⚠️  Could not set ACL makePublic:", aclErr.message);
      }
      const publicUrl = buildPublicUrl(firebaseBucket.name, destination);
      console.log("✅ Firebase upload successful:", publicUrl.substring(0, 100));
      return publicUrl;
    } catch (bufferUploadError) {
      console.error("❌ Firebase buffer upload failed, switching to local disk fallback:", bufferUploadError.message);
      return saveBufferLocally(file, safeFolder);
    }
  }

  if (file.path) {
    console.log("📤 Uploading from file path...");
    try {
      await firebaseBucket.upload(file.path, uploadOptions);
      const cloudFile = firebaseBucket.file(destination);
      try {
        await cloudFile.makePublic();
      } catch (aclErr) {
        console.warn("⚠️  Could not set ACL makePublic:", aclErr.message);
      }

      try {
        await unlink(file.path);
      } catch {
        // ignore temp file cleanup errors
      }

      const publicUrl = buildPublicUrl(firebaseBucket.name, destination);
      console.log("✅ Firebase upload successful:", publicUrl.substring(0, 100));
      return publicUrl;
    } catch (pathUploadError) {
      console.error("❌ Firebase file path upload failed, returning fallback path:", pathUploadError.message);
      const fileName = path.basename(file.path);
      return `/uploads/${fileName}`;
    }
  }

  console.error("❌ Invalid file payload: no buffer or path");
  return "";
};
