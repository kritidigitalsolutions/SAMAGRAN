import express from "express";
import {
  getAllBannersForAdmin,
} from "../../controllers/banner.controller.js";
import { cacheMiddleware } from "../../utils/cache.js";

const router = express.Router();

router.get("/", cacheMiddleware({ ttl: 180, prefix: "user-banners" }), getAllBannersForAdmin);

export default router;
