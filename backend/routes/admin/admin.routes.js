import express from "express";
import { protectAdmin, requireSuperAdmin } from "../../middleware/admin.middleware.js";
import { upload } from "../../middleware/upload.js";
import { getCorporateDetails, updateCorporateDetails } from "../../controllers/admin/corporateDetails.controller.js";
import {
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword
} from "../../controllers/admin/adminProfile.controller.js";

const router = express.Router();

router.get("/dashboard", protectAdmin, (req, res) => {
  res.json({
    message: "Admin access granted",
    admin: req.admin,
  });
});

router.get("/profile", protectAdmin, getAdminProfile);
router.patch("/profile", protectAdmin, updateAdminProfile);
router.patch("/password", protectAdmin, updateAdminPassword);

router.get("/corporate-details", protectAdmin, getCorporateDetails);
router.patch("/corporate-details", protectAdmin, requireSuperAdmin, upload.single("logo"), updateCorporateDetails);

export default router;