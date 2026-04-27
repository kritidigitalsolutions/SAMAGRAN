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
    return "";
  }

  if (!isFirebaseReady || !firebaseBucket) {
    throw new Error("Firebase storage is not configured on server");
  }

  const extension = path.extname(file.originalname || file.path || "") || "";
  const safeFolder = String(folder || "uploads").replace(/^\/+|\/+$/g, "");
  const destination = `${safeFolder}/${Date.now()}-${randomUUID()}${extension}`;
  const uploadOptions = {
    destination,
    metadata: {
      contentType: file.mimetype || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
    },
  };

  if (file.buffer) {
    const cloudFile = firebaseBucket.file(destination);
    await cloudFile.save(file.buffer, uploadOptions);
    await cloudFile.makePublic();
    return buildPublicUrl(firebaseBucket.name, destination);
  }

  if (file.path) {
    await firebaseBucket.upload(file.path, uploadOptions);
    const cloudFile = firebaseBucket.file(destination);
    await cloudFile.makePublic();

    try {
      await unlink(file.path);
    } catch {
      // ignore temp file cleanup errors
    }

    return buildPublicUrl(firebaseBucket.name, destination);
  }

  throw new Error("Invalid file payload for Firebase upload");
};
