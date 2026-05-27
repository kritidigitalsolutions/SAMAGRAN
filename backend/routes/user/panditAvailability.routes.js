import express from "express";
import { getPanditAvailabilityForUser } from "../../controllers/panditAvailability.controller.js";

const router = express.Router();

router.get("/:panditId", getPanditAvailabilityForUser);

export default router;
