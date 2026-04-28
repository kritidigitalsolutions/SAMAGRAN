import express from "express";
import {
  getAllBannersForAdmin,
} from "../../controllers/banner.controller.js";

const router = express.Router();

router.get("/", getAllBannersForAdmin);

export default router;
