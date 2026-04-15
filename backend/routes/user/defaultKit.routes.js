import express from "express";
import {
  getDefaultKitByIdForUsers,
  getDefaultKitsForUsers,
} from "../../controllers/defaultKit.controller.js";

const router = express.Router();

router.get("/", getDefaultKitsForUsers);
router.get("/:id", getDefaultKitByIdForUsers);

export default router;
