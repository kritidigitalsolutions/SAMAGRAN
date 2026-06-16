import DeliveryPricing from "../../models/vendorDeliveryPricing.model.js";


export const addPricing = async (req, res) => {
  try {

    console.log("vendorId =>", req.vendorId);

    if (!req.vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID missing from middleware"
      });
    }

    const pricing = await DeliveryPricing.create({
      vendorId: req.vendorId,
      locationName: req.body.locationName,
      state: req.body.state || "",
      pincode: req.body.pincode || "",
      deliveryCharge: req.body.deliveryCharge
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

    const vendorId = req.vendorId;

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

    const pricing = await DeliveryPricing.findOne({
      _id: id,
      vendorId: req.vendorId
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing not found"
      });
    }

    pricing.locationName =
      req.body.locationName ??
      pricing.locationName;

    pricing.deliveryCharge =
      req.body.deliveryCharge ??
      pricing.deliveryCharge;

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

    const deleted =
      await DeliveryPricing.findOneAndDelete({
        _id: req.params.id,
        vendorId: req.vendorId
      });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Pricing not found"
      });
    }

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