import dotenv from "dotenv";
dotenv.config();

import { randomUUID } from "crypto";
import axios from "axios";
import sharp from "sharp";
import connectDB from "../config/db.js";
import { firebaseBucket, isFirebaseReady } from "../config/firebase.js";
import Banner from "../models/banner.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import Item from "../models/product.model.js";
import { cacheDelByPrefix } from "../utils/cache.js";

const DEFAULT_BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || "samagran-80a19.firebasestorage.app";

const convertAndUploadToWebp = async (imageUrl, folder = "uploads") => {
  if (!imageUrl || typeof imageUrl !== "string") return imageUrl;
  const trimmed = imageUrl.trim();

  // If already webp, skip
  if (trimmed.toLowerCase().endsWith(".webp")) {
    return trimmed;
  }

  // Must be an http/https url
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

  try {
    // 1. Download original image
    const response = await axios.get(trimmed, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    const originalBuffer = Buffer.from(response.data);
    const originalSizeKb = (originalBuffer.length / 1024).toFixed(1);

    // 2. Compress & convert with Sharp
    const webpBuffer = await sharp(originalBuffer)
      .rotate()
      .resize({
        width: 1000,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    const newSizeKb = (webpBuffer.length / 1024).toFixed(1);
    const reduction = Math.round((1 - webpBuffer.length / originalBuffer.length) * 100);

    // 3. Upload to Firebase Storage
    const bucketName = firebaseBucket?.name || DEFAULT_BUCKET_NAME;
    const safeFolder = folder.replace(/^\/+|\/+$/g, "");
    const destination = `${safeFolder}/${Date.now()}-${randomUUID()}.webp`;

    const cloudFile = firebaseBucket.file(destination);
    await cloudFile.save(webpBuffer, {
      destination,
      metadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000",
      },
    });

    try {
      await cloudFile.makePublic();
    } catch {
      // ignore makePublic warning if uniform bucket access
    }

    const encodedPath = destination
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const newPublicUrl = `https://storage.googleapis.com/${bucketName}/${encodedPath}`;

    console.log(`  ✓ Compressed: ${originalSizeKb} KB ➜ ${newSizeKb} KB (${reduction}% saved)`);
    return newPublicUrl;
  } catch (err) {
    console.warn(`  ⚠️ Failed to convert image (${imageUrl}): ${err.message}. Keeping original.`);
    return imageUrl;
  }
};

const runMigration = async () => {
  console.log("==================================================");
  console.log("🚀 STARTING AUTOMATIC IMAGE COMPRESSION TO WEBP");
  console.log("==================================================");

  await connectDB();

  if (!isFirebaseReady || !firebaseBucket) {
    console.error("❌ Firebase Storage is not configured!");
    process.exit(1);
  }

  // 1. BANNERS
  console.log("\n--- [1/4] Processing Banners ---");
  const banners = await Banner.find();
  for (const banner of banners) {
    if (banner.image && !banner.image.endsWith(".webp")) {
      console.log(`Banners: "${banner.title}"`);
      const newUrl = await convertAndUploadToWebp(banner.image, "banners");
      if (newUrl !== banner.image) {
        banner.image = newUrl;
        await banner.save();
      }
    }
  }

  // 2. CATEGORIES
  console.log("\n--- [2/4] Processing Categories ---");
  const categories = await Category.find();
  for (const cat of categories) {
    if (cat.image && !cat.image.endsWith(".webp")) {
      console.log(`Category: "${cat.name}"`);
      const newUrl = await convertAndUploadToWebp(cat.image, "categories");
      if (newUrl !== cat.image) {
        cat.image = newUrl;
        await cat.save();
      }
    }
  }

  // 3. SUBCATEGORIES (fixes .jfif and heavy images)
  console.log("\n--- [3/4] Processing SubCategories ---");
  const subCategories = await SubCategory.find();
  for (const sub of subCategories) {
    if (sub.image && !sub.image.endsWith(".webp")) {
      console.log(`SubCategory: "${sub.name}"`);
      const newUrl = await convertAndUploadToWebp(sub.image, "subcategories");
      if (newUrl !== sub.image) {
        sub.image = newUrl;
        await sub.save();
      }
    }
  }

  // 4. PRODUCTS / ITEMS
  console.log("\n--- [4/4] Processing Product Catalog Items ---");
  const items = await Item.find();
  for (const item of items) {
    let images = item.media?.image || item.media?.Images || [];
    if (!Array.isArray(images)) continue;

    let hasChanges = false;
    const updatedImages = [];

    for (const imgUrl of images) {
      if (imgUrl && !imgUrl.endsWith(".webp")) {
        console.log(`Item: "${item.title}"`);
        const newUrl = await convertAndUploadToWebp(imgUrl, "products");
        if (newUrl !== imgUrl) {
          hasChanges = true;
          updatedImages.push(newUrl);
        } else {
          updatedImages.push(imgUrl);
        }
      } else if (imgUrl) {
        updatedImages.push(imgUrl);
      }
    }

    if (hasChanges) {
      if (item.media) {
        item.media.image = updatedImages;
        item.media.Images = updatedImages;
      }
      await item.save();
    }
  }

  // 5. Clear Caches
  await cacheDelByPrefix("user-");
  console.log("\n🧹 Cache invalidated for user endpoints.");

  console.log("\n==================================================");
  console.log("🎉 ALL EXISTING IMAGES SUCCESSFULLY COMPRESSED!");
  console.log("==================================================");
  process.exit(0);
};

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
