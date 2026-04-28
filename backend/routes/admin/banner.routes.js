import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import {
  createBenner,
  deleteBanner,
  updateBanner,
  getAllBannersForAdmin,

} from "../../controllers/admin/banner.controller.js";

const router = express.Router();

router.get("/", protectAdmin, getAllBannersForAdmin);
router.post("/", protectAdmin, upload.single("imageFile"), createBenner);
router.put("/:id", protectAdmin, upload.single("imageFile"), updateBanner);
router.delete("/:id", protectAdmin, deleteBanner);

export default router;
