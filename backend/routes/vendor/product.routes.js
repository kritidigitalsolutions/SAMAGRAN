import express from "express";
import {
  addProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} from "../../controllers/admin/product.controller.js";
import { upload } from "../../middleware/upload.js";
import { protectVendor } from "../../middleware/vendor.middleware.js";

const router = express.Router();

router.post("/add", protectVendor, upload.array("images", 5), addProduct);
router.get("/", protectVendor, getProducts);
router.get("/:id", protectVendor, getSingleProduct);
router.put("/:id", protectVendor, upload.array("images", 5), updateProduct);
router.delete("/:id", protectVendor, deleteProduct);

export default router;
