import User from "../models/user.model.js";
import DeliveryPricing from "../models/vendorDeliveryPricing.model.js";


export const getUserDeliveryCharge = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let city = (req.query.city || "").trim();
    let pincode = (req.query.pincode || "").trim();
    const vendorId = (req.query.vendorId || "").trim();

    if (!city && !pincode) {
      if (user.selectedCity?.trim()) {
        city = user.selectedCity.trim();
      }

      if (user.savedAddresses && user.savedAddresses.length) {
        const defaultAddress =
          user.savedAddresses.find(x => x.isDefault) || user.savedAddresses[0];

        if (!city) {
          city = defaultAddress?.city || "";
        }
        pincode = defaultAddress?.pincode || "";
      }

      if (!city && user.address?.trim()) {
        city = user.address.trim();
      }
    }

    if (!city && !pincode) {
      return res.status(400).json({
        success: false,
        message: "User location not found"
      });
    }

    const filter = { status: { $ne: "inactive" } };
    if (vendorId) {
      filter.vendorId = vendorId;
    }

    let pricing = [];
    if (pincode) {
      pricing = await DeliveryPricing.find({
        ...filter,
        pincode: pincode
      });
    }

    if ((!pricing || pricing.length === 0) && city) {
      pricing = await DeliveryPricing.find({
        ...filter,
        locationName: {
          $regex: new RegExp(`^${city}$`, "i")
        }
      });
    }

    return res.json({
      success: true,
      city,
      pincode,
      count: pricing.length,
      data: pricing
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};