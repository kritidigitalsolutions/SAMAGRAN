import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import path from "path";
import { firebaseBucket, isFirebaseReady } from "../config/firebase.js";

const DEFAULT_BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || "samagran-80a19.firebasestorage.app";

const buildPublicUrl = (bucketName, destination) => {
  const targetBucket = bucketName || DEFAULT_BUCKET_NAME;
  const encodedPath = destination
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://storage.googleapis.com/${targetBucket}/${encodedPath}`;
};

/**
 * Uploads a file directly to Firebase Storage bucket.
 * NO local disk uploads or local file persistence are allowed.
 */
export const uploadFileToFirebase = async (file, { folder = "uploads" } = {}) => {
  if (!file) {
    console.warn("⚠️ uploadFileToFirebase: No file provided");
    return "";
  }

  const safeFolder = String(folder || "uploads").replace(/^\/+|\/+$/g, "");
  const extension = path.extname(file.originalname || file.path || "") || "";
  const destination = `${safeFolder}/${Date.now()}-${randomUUID()}${extension}`;

  console.log("📤 Firebase upload starting for:", {
    folder: safeFolder,
    destination,
    mimetype: file.mimetype,
    size: file?.buffer?.length || file?.size,
  });

  const bucketName = firebaseBucket?.name || DEFAULT_BUCKET_NAME;

  if (!isFirebaseReady || !firebaseBucket) {
    console.error("❌ Firebase Storage is not configured or ready! Cannot upload file.");
    // Strictly no local fallback saving allowed
    return "";
  }

  const uploadOptions = {
    destination,
    metadata: {
      contentType: file.mimetype || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
    },
  };

  try {
    if (file.buffer) {
      console.log("📤 Uploading buffer directly to Firebase Storage bucket...");
      const cloudFile = firebaseBucket.file(destination);
      await cloudFile.save(file.buffer, uploadOptions);
      try {
        await cloudFile.makePublic();
      } catch (aclErr) {
        console.warn("⚠️ Could not set ACL makePublic:", aclErr.message);
      }
      const publicUrl = buildPublicUrl(bucketName, destination);
      console.log("✅ Firebase upload successful:", publicUrl);
      return publicUrl;
    }

    if (file.path) {
      console.log("📤 Uploading file path directly to Firebase Storage bucket...");
      await firebaseBucket.upload(file.path, uploadOptions);
      const cloudFile = firebaseBucket.file(destination);
      try {
        await cloudFile.makePublic();
      } catch (aclErr) {
        console.warn("⚠️ Could not set ACL makePublic:", aclErr.message);
      }

      try {
        await unlink(file.path);
      } catch {
        // ignore temp file cleanup errors
      }

      const publicUrl = buildPublicUrl(bucketName, destination);
      console.log("✅ Firebase upload successful:", publicUrl);
      return publicUrl;
    }

    console.error("❌ Invalid file payload: no buffer or path");
    return "";
  } catch (error) {
    if (error.message && error.message.includes("invalid_grant")) {
      console.error("❌ Firebase upload failed due to invalid/revoked service account key in backend/.env!");
      console.error("👉 Please generate a fresh Service Account Private Key from Firebase Console (Project Settings -> Service Accounts) and update FIREBASE_PRIVATE_KEY and FIREBASE_PRIVATE_KEY_ID in backend/.env.");
    } else {
      console.error("❌ Firebase upload failed:", error.message);
    }
    // Strictly no local fallback saving allowed
    return "";
  }
};
