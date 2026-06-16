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

    let city = "";

    if (user.selectedCity?.trim()) {
      city = user.selectedCity.trim();
    }

    if (!city && user.savedAddresses.length) {
      const defaultAddress =
        user.savedAddresses.find(
          x => x.isDefault
        );

      city = defaultAddress?.city || "";
    }

    if (!city && user.address?.trim()) {
      city = user.address.trim();
    }

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "User location not found"
      });
    }

    const pricing =
      await DeliveryPricing.find({
        locationName: {
          $regex: new RegExp(
            `^${city}$`,
            "i"
          )
        },
        status: true
      });

    return res.json({
      success: true,
      city,
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