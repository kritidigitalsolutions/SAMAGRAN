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

const router = express.Router();

// User kits (default + special)
router.get("/kits", getAllKitsForUsers);
router.get("/kits/default", getDefaultKitsForUsers);
router.get("/kits/default/:id", getDefaultKitByIdForUsers);
router.get("/kits/special", getAllKitsUser);
router.get("/kits/special/:id", getSingleKitUser);

export default router;
