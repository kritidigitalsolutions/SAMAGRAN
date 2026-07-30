import Admin from "../../models/admin.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const emptyCorporateDetails = {
  companyName: "",
  logoUrl: "",
  address: "",
  cin: "",
  pan: "",
  fssai: "",
  email: "",
  phone: "",
  authorizedSignatory: "",
};

export const getCorporateDetails = async (req, res) => {
  try {
    const admin = await Admin.findOne({ role: "super" }).lean();
    const details = admin?.corporateDetails || {};
    const merged = { ...emptyCorporateDetails, ...details };
    return res.json({ success: true, data: merged });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to get corporate details" });
  }
};

export const updateCorporateDetails = async (req, res) => {
  try {
    if (req.admin?.role !== "super") {
      return res.status(403).json({ success: false, message: "Super admin access required" });
    }

    const {
      companyName,
      logoUrl,
      address,
      cin,
      pan,
      fssai,
      email,
      phone,
      authorizedSignatory,
    } = req.body || {};

    const admin = await Admin.findOne({ role: "super" }).lean();
    if (!admin) {
      return res.status(404).json({ success: false, message: "Super admin account not found" });
    }

    let finalLogoUrl = admin.corporateDetails?.logoUrl || "";
    if (req.file) {
      try {
        finalLogoUrl = await uploadFileToFirebase(req.file, { folder: "corporate" });
      } catch (uploadErr) {
        console.error("❌ Failed to upload logo in updateCorporateDetails:", uploadErr);
        return res.status(500).json({ success: false, message: `Logo upload failed: ${uploadErr.message}` });
      }
    } else if (logoUrl !== undefined) {
      finalLogoUrl = String(logoUrl).trim();
    }

    const newCorporateDetails = {
      companyName: String(companyName !== undefined ? companyName : (admin.corporateDetails?.companyName || "")).trim(),
      logoUrl: finalLogoUrl,
      address: String(address !== undefined ? address : (admin.corporateDetails?.address || "")).trim(),
      cin: String(cin !== undefined ? cin : (admin.corporateDetails?.cin || "")).trim(),
      pan: String(pan !== undefined ? pan : (admin.corporateDetails?.pan || "")).trim(),
      fssai: String(fssai !== undefined ? fssai : (admin.corporateDetails?.fssai || "")).trim(),
      email: String(email !== undefined ? email : (admin.corporateDetails?.email || "")).trim(),
      phone: String(phone !== undefined ? phone : (admin.corporateDetails?.phone || "")).trim(),
      authorizedSignatory: String(authorizedSignatory !== undefined ? authorizedSignatory : (admin.corporateDetails?.authorizedSignatory || "")).trim(),
    };

    const updatedAdmin = await Admin.findOneAndUpdate(
      { role: "super" },
      { $set: { corporateDetails: newCorporateDetails } },
      { new: true, runValidators: false }
    );

    return res.json({ success: true, message: "Corporate details updated successfully", data: updatedAdmin.corporateDetails });
  } catch (error) {
    console.error("❌ Error updating corporate details:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update corporate details" });
  }
};
