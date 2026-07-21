import DeliveryPricing from "../../models/vendorDeliveryPricing.model.js";

const resolveVendorId = (req) => {
  if (req.admin?.role === "vendor") {
    return req.admin.vendorId ? String(req.admin.vendorId) : null;
  }
  if (req.admin?.role === "super") {
    return req.query?.vendorId || req.body?.vendorId || null;
  }
  return null;
};

export const addPricing = async (req, res) => {
  try {
    const vendorId = resolveVendorId(req);

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required"
      });
    }

    const pricing = await DeliveryPricing.create({
      vendorId,
      locationName: req.body.locationName,
      state: req.body.state || "",
      pincode: req.body.pincode || "",
      deliveryCharge: Number(req.body.deliveryCharge || 0),
      codCharge: Number(req.body.codCharge || 0),
      status: req.body.status || "active"
    });

    return res.status(201).json({
      success: true,
      data: pricing
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPricingList = async (req, res) => {
  try {
    const vendorId = resolveVendorId(req);

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required"
      });
    }

    const data = await DeliveryPricing
      .find({ vendorId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updatePricing = async (req, res) => {
  try {
    const { id } = req.params;

    const pricing = await DeliveryPricing.findById(id);

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing not found"
      });
    }

    // Verify ownership for vendor role
    if (req.admin?.role === "vendor") {
      const vendorId = String(req.admin.vendorId);
      if (String(pricing.vendorId) !== vendorId) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own delivery charges"
        });
      }
    }

    pricing.locationName =
      req.body.locationName ??
      pricing.locationName;

    pricing.deliveryCharge =
      req.body.deliveryCharge ??
      pricing.deliveryCharge;

    pricing.codCharge =
      req.body.codCharge ??
      pricing.codCharge;

    pricing.state =
      req.body.state ??
      pricing.state;

    pricing.pincode =
      req.body.pincode ??
      pricing.pincode;

    pricing.status =
      req.body.status ??
      pricing.status;

    await pricing.save();

    return res.json({
      success: true,
      message: "Pricing updated successfully",
      data: pricing
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deletePricing = async (req, res) => {
  try {
    const { id } = req.params;

    const pricing = await DeliveryPricing.findById(id);

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing not found"
      });
    }

    // Verify ownership for vendor role
    if (req.admin?.role === "vendor") {
      const vendorId = String(req.admin.vendorId);
      if (String(pricing.vendorId) !== vendorId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own delivery charges"
        });
      }
    }

    await DeliveryPricing.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Pricing deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};