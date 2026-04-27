import BookingPricing from "../../models/bookingPrice.js";


// 👉 ADMIN: Create or Update Pricing
export const setBookingPrice = async (req, res) => {
  try {
    const { price } = req.body;

    if (!price) {
      return res.status(400).json({ message: "Price is required" });
    }

    // Check existing pricing
    let pricing = await BookingPricing.findOne();

    if (pricing) {
      pricing.price = price;
      await pricing.save();
    } else {
      pricing = await BookingPricing.create({ price });
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
      price: pricing.price,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};