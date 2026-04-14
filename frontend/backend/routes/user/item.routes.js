import express from "express";
import {
  getItemsUser,
  getSingleItemUser
} from "../../controllers/item.controller.js";

const router = express.Router();

// Public APIs
router.get("/", getItemsUser);
router.get("/:id", getSingleItemUser);

export default router;