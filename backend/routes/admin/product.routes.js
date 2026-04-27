import express from "express";
import {
  addProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} from "../../controllers/admin/product.controller.js";
import { upload } from "../../middleware/upload.js";
import { protectAdmin } from "../../middleware/admin.middleware.js";

const router = express.Router();

router.post("/add", protectAdmin, upload.array("images", 5), addProduct);
router.get("/", protectAdmin, getProducts);
router.get("/:id", protectAdmin, getSingleProduct);
router.put("/:id", protectAdmin, upload.array("images", 5), updateProduct);
router.delete("/:id", protectAdmin, deleteProduct);

export default router;
