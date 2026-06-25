import express from "express";
import { getAllSubCategoriesUser } from "../../controllers/subCategory.controller.js";

const router = express.Router();

router.get("/", getAllSubCategoriesUser);

export default router;
