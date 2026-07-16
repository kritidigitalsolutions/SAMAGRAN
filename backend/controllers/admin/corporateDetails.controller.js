import Admin from "../../models/admin.model.js";

const defaultCorporateDetails = {
  companyName: "Samagran Ventures Private Limited",
  address: "godown, Patlipada, Hiranandani, Thane (W)-400607, MH, India",
  cin: "U74140MH2025PTC055568",
  pan: "AAFCS8024E",
  fssai: "10018064001545",
  email: "support@samagran.com",
  phone: "+91-9988776655",
  authorizedSignatory: "Anil Sharma",
  hideCompanyDetails: false,
};

export const getCorporateDetails = async (req, res) => {
  try {
    const admin = await Admin.findOne({ role: "super" }).lean();
    const details = admin?.corporateDetails || {};
    // Merge with defaults to ensure all fields are present
    const merged = { ...defaultCorporateDetails, ...details };
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
      address,
      cin,
      pan,
      fssai,
      email,
      phone,
      authorizedSignatory,
      hideCompanyDetails,
    } = req.body || {};

    const admin = await Admin.findOne({ role: "super" });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Super admin account not found" });
    }

    admin.corporateDetails = {
      companyName: String(companyName !== undefined ? companyName : (admin.corporateDetails?.companyName || defaultCorporateDetails.companyName)).trim(),
      address: String(address !== undefined ? address : (admin.corporateDetails?.address || defaultCorporateDetails.address)).trim(),
      cin: String(cin !== undefined ? cin : (admin.corporateDetails?.cin || defaultCorporateDetails.cin)).trim(),
      pan: String(pan !== undefined ? pan : (admin.corporateDetails?.pan || defaultCorporateDetails.pan)).trim(),
      fssai: String(fssai !== undefined ? fssai : (admin.corporateDetails?.fssai || defaultCorporateDetails.fssai)).trim(),
      email: String(email !== undefined ? email : (admin.corporateDetails?.email || defaultCorporateDetails.email)).trim(),
      phone: String(phone !== undefined ? phone : (admin.corporateDetails?.phone || defaultCorporateDetails.phone)).trim(),
      authorizedSignatory: String(authorizedSignatory !== undefined ? authorizedSignatory : (admin.corporateDetails?.authorizedSignatory || defaultCorporateDetails.authorizedSignatory)).trim(),
      hideCompanyDetails: Boolean(hideCompanyDetails !== undefined ? hideCompanyDetails : (admin.corporateDetails?.hideCompanyDetails || defaultCorporateDetails.hideCompanyDetails)),
    };

    await admin.save();

    return res.json({ success: true, message: "Corporate details updated successfully", data: admin.corporateDetails });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update corporate details" });
  }
};
