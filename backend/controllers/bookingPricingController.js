import BookingPricing from "../models/bookingPrice.js";

// 👉 USER: Get Active Pricing
export const getBookingPrice = async (req, res) => {
  try {
    const pricing = await BookingPricing.findOne({ isActive: true });

    if (!pricing) {
      return res.status(404).json({ message: "Pricing not found" });
    }

    res.status(200).json({
      success: true,
      price: pricing.price,
      panditCommissionPercent: pricing.panditCommissionPercent || 0,
      panditCommissionThreshold: pricing.panditCommissionThreshold || 0,
      minRecommendationPriceForCommission: pricing.minRecommendationPriceForCommission || 0,
      freeDeliveryThreshold: pricing.freeDeliveryThreshold || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
