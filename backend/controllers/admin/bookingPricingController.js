import BookingPricing from "../../models/bookingPrice.js";


// 👉 ADMIN: Create or Update Pricing
export const setBookingPrice = async (req, res) => {
  try {
    const {
      price,
      panditCommissionPercent,
      panditCommissionThreshold,
      minRecommendationPriceForCommission,
      freeDeliveryThreshold,
      autoCancelDurationHours
    } = req.body;

    if (
      price === undefined &&
      panditCommissionPercent === undefined &&
      panditCommissionThreshold === undefined &&
      minRecommendationPriceForCommission === undefined &&
      freeDeliveryThreshold === undefined &&
      autoCancelDurationHours === undefined
    ) {
      return res.status(400).json({ message: "At least one value is required" });
    }

    if (panditCommissionPercent !== undefined) {
      const percentValue = Number(panditCommissionPercent);
      if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 100) {
        return res.status(400).json({ message: "panditCommissionPercent must be between 0 and 100" });
      }
    }

    if (panditCommissionThreshold !== undefined) {
      const thresholdValue = Number(panditCommissionThreshold);
      if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
        return res.status(400).json({ message: "panditCommissionThreshold must be a positive number" });
      }
    }

    if (minRecommendationPriceForCommission !== undefined) {
      const recLimitValue = Number(minRecommendationPriceForCommission);
      if (!Number.isFinite(recLimitValue) || recLimitValue < 0) {
        return res.status(400).json({ message: "minRecommendationPriceForCommission must be a positive number" });
      }
    }

    if (freeDeliveryThreshold !== undefined) {
      const freeDelValue = Number(freeDeliveryThreshold);
      if (!Number.isFinite(freeDelValue) || freeDelValue < 0) {
        return res.status(400).json({ message: "freeDeliveryThreshold must be a positive number" });
      }
    }

    if (autoCancelDurationHours !== undefined) {
      const durationValue = Number(autoCancelDurationHours);
      if (!Number.isFinite(durationValue) || durationValue < 0) {
        return res.status(400).json({ message: "autoCancelDurationHours must be a positive number" });
      }
    }

    // Check existing pricing
    let pricing = await BookingPricing.findOne();

    if (pricing) {
      if (price !== undefined) {
        pricing.price = price;
      }
      if (panditCommissionPercent !== undefined) {
        pricing.panditCommissionPercent = Number(panditCommissionPercent);
      }
      if (panditCommissionThreshold !== undefined) {
        pricing.panditCommissionThreshold = Number(panditCommissionThreshold);
      }
      if (minRecommendationPriceForCommission !== undefined) {
        pricing.minRecommendationPriceForCommission = Number(minRecommendationPriceForCommission);
      }
      if (freeDeliveryThreshold !== undefined) {
        pricing.freeDeliveryThreshold = Number(freeDeliveryThreshold);
      }
      if (autoCancelDurationHours !== undefined) {
        pricing.autoCancelDurationHours = Number(autoCancelDurationHours);
      }
      await pricing.save();
    } else {
      if (price === undefined) {
        return res.status(400).json({ message: "Price is required to create pricing" });
      }
      pricing = await BookingPricing.create({
        price,
        panditCommissionPercent: Number(panditCommissionPercent || 0),
        panditCommissionThreshold: Number(panditCommissionThreshold || 500),
        minRecommendationPriceForCommission: Number(minRecommendationPriceForCommission || 0),
        freeDeliveryThreshold: Number(freeDeliveryThreshold || 0),
        autoCancelDurationHours: Number(autoCancelDurationHours || 1),
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking price updated successfully",
      data: pricing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 👉 ADMIN: Toggle Active/Inactive
export const togglePricingStatus = async (req, res) => {
  try {
    const pricing = await BookingPricing.findById(req.params.id);

    if (!pricing) {
      return res.status(404).json({ message: "Pricing not found" });
    }

    pricing.isActive = !pricing.isActive;
    await pricing.save();

    res.status(200).json({
      success: true,
      message: "Pricing status updated",
      data: pricing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 👉 USER: Get Active Pricing
export const getBookingPrice = async (req, res) => {
  try {
    const pricing = await BookingPricing.findOne({ isActive: true });

    if (!pricing) {
      return res.status(404).json({ message: "Pricing not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: pricing._id,
        price: pricing.price,
        panditCommissionPercent: pricing.panditCommissionPercent || 0,
        panditCommissionThreshold: pricing.panditCommissionThreshold || 0,
        minRecommendationPriceForCommission: pricing.minRecommendationPriceForCommission || 0,
        freeDeliveryThreshold: pricing.freeDeliveryThreshold || 0,
        autoCancelDurationHours: pricing.autoCancelDurationHours || 1,
        isActive: pricing.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};