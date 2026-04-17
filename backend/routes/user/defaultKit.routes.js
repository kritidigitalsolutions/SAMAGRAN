import express from "express";
import {
  getDefaultKitByIdForUsers,
  getDefaultKitsForUsers,
} from "../../controllers/defaultKit.controller.js";
import protect from "../../middleware/auth.middleware.js";

import {  createUserKitFromDefaultKit} from "../../controllers/defaultKit.controller.js";

const router = express.Router();

router.get("/", getDefaultKitsForUsers);
router.get("/:id", getDefaultKitByIdForUsers);
// Create a customizable draft from a selected default kit
router.post("/from-default/:defaultKitId", protect, createUserKitFromDefaultKit);

export default router;
