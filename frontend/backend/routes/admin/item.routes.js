import express from "express";
import { addItem, getItems ,getSingleItem,updateItem,deleteItem} from "../../controllers/admin/item.controller.js";
import { upload } from "../../middleware/upload.js";
import { protectAdmin } from "../../middleware/admin.middleware.js";

const router = express.Router();

router.post("/add", protectAdmin, upload.array("images", 5), addItem);
router.get("/",protectAdmin, getItems);
router.get("/:id", protectAdmin,getSingleItem);
router.put("/:id", protectAdmin,updateItem);
router.delete("/:id",protectAdmin, deleteItem);

export default router;