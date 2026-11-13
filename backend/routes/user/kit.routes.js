import express from "express";
import { getAllKitsForUsers } from "../../controllers/kit.controller.js";
import {
  getDefaultKitByIdForUsers,
  getDefaultKitsForUsers,
} from "../../controllers/defaultKit.controller.js";
import {
  getAllKitsUser,
  getSingleKitUser,
} from "../../controllers/festivalKit.controller.js";
import { cacheMiddleware } from "../../utils/cache.js";

const router = express.Router();

// User kits (default + special)
router.get("/kits", cacheMiddleware({ ttl: 60, prefix: "user-kits" }), getAllKitsForUsers);
router.get("/kits/default", cacheMiddleware({ ttl: 60, prefix: "user-kits" }), getDefaultKitsForUsers);
router.get("/kits/default/:id", cacheMiddleware({ ttl: 120, prefix: "user-kit" }), getDefaultKitByIdForUsers);
router.get("/kits/special", cacheMiddleware({ ttl: 60, prefix: "user-kits" }), getAllKitsUser);
router.get("/kits/special/:id", cacheMiddleware({ ttl: 120, prefix: "user-kit" }), getSingleKitUser);

export default router;
