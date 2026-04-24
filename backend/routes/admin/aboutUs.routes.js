import express from "express";

const router = express.Router();

import { upsertAboutUs, getAboutUs} from "../../controllers/admin/aboutUs.controller.js";

router.patch("/", upsertAboutUs);
router.get("/", getAboutUs);

export default router;
