import SupportSetting from "../../models/supportSetting.model.js";

// Get Support Contact Settings (Shared by user & admin)
export const getSupportSetting = async (req, res) => {
  try {
    let setting = await SupportSetting.findOne();
    if (!setting) {
      setting = await SupportSetting.create({
        whatsappNo: "+91-9988776655",
        callNo: "+91-9988776655",
        email: "support@samagran.com",
      });
    }
    return res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get support settings",
    });
  }
};

// Update Support Contact Settings (Super Admin only)
export const updateSupportSetting = async (req, res) => {
  try {
    if (req.admin?.role !== "super") {
      return res.status(403).json({
        success: false,
        message: "Super admin access required",
      });
    }

    const { whatsappNo, callNo, email } = req.body || {};

    let setting = await SupportSetting.findOne();
    if (!setting) {
      setting = new SupportSetting();
    }

    if (whatsappNo !== undefined) setting.whatsappNo = String(whatsappNo).trim();
    if (callNo !== undefined) setting.callNo = String(callNo).trim();
    if (email !== undefined) setting.email = String(email).trim();

    await setting.save();

    return res.json({
      success: true,
      message: "Support settings updated successfully",
      data: setting,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update support settings",
    });
  }
};
