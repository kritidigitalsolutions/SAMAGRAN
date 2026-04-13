import express from "express";
import { protectAdmin } from "../../middleware/admin.middleware.js";

const router = express.Router();

router.get("/dashboard", protectAdmin, (req, res) => {
  res.json({
    message: "Admin access granted",
    admin: req.admin,
  });
});

export default router;