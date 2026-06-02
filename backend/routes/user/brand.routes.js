import express from "express";
import { upload } from "../../middleware/upload.js";
import {
  getAllBrands,
  getBrandById,
} from "../../controllers/brand.controller.js";

const router = express.Router();

router.get("/", getAllBrands);
router.get("/:id", getBrandById);


export default router;
