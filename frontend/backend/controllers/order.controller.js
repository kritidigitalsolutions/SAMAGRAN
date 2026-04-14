import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";

export const placeOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentMethod = "COD", address } = req.body;

    const cart = await Cart.find({ user: userId });

    if (!cart.length) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const total = cart.reduce((sum, item) => {
      return sum + item.priceAtAdd * item.quantity;
    }, 0);

    const items = cart.map((item) => ({
      productType: item.productType,
      product: item.product,
      quantity: item.quantity,
      price: item.priceAtAdd,
    }));

    const finalAddress = {
      name: req.user.name,
      phone: req.user.phone,
      fullAddress: address?.fullAddress || req.user.address,
      city: address?.city || "",
      state: address?.state || "",
      pincode: address?.pincode || "",
    };

    const order = await Order.create({
      user: userId,
      items,
      totalAmount: total,
      paymentMethod,
      address: finalAddress,
    });

    await Cart.deleteMany({ user: userId });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};