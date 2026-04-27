import express from "express";
import {
  getAlltemples
} from "../../controllers/temple.controller.js";

const router = express.Router();

router.get("/", getAlltemples);


export default router;
