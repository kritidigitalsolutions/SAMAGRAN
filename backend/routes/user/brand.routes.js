import express from "express";
import { optionalProtect } from "../../middleware/auth.middleware.js";
import {
  getAllBrandsUser,
  getBrandById,
} from "../../controllers/brand.controller.js";

const router = express.Router();

// optionalProtect: allows guests (?city=) and authenticated users (selectedCity)
router.get("/", optionalProtect, getAllBrandsUser);
router.get("/:id", getBrandById);


export default router;
