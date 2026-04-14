import UserKit from "../models/userKit.model.js";
import Item from "../models/product.model.js";
import Order from "../models/order.model.js";

// ------------------------------------
// Helper: Build items + calculate total
// ------------------------------------
const buildItemsAndTotal = async (items) => {
  let finalItems = [];
  let totalPrice = 0;

  for (const row of items) {
    const { productId, quantity } = row;

    if (!productId) {
      throw new Error("productId is required");
    }

    const product = await Item.findOne({
      _id: productId,
      status: "active",
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const qty = Number(quantity || 1);

    if (qty < 1) {
      throw new Error("Quantity must be at least 1");
    }

    if (product.stock.quantity < qty) {
      throw new Error(`${product.title} out of stock`);
    }

    const price = Number(product.pricing?.price || 0);

    finalItems.push({
      product: product._id,
      quantity: qty,
      priceAtTime: price,
    });

    totalPrice += price * qty;
  }

  return { finalItems, totalPrice };
};

// ------------------------------------
// POST /api/user-kits
// Create user custom kit as draft
// ------------------------------------
export const createUserKit = async (req, res) => {
  try {
    const { name = "Custom Kit", items = [], baseKit = null } = req.body;

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "Items are required",
      });
    }

    const { finalItems, totalPrice } =
      await buildItemsAndTotal(items);

    const userKit = await UserKit.create({
      user: req.user._id,
      name,
      baseKit,
      items: finalItems,
      totalPrice,
      status: "draft",
      paymentStatus: "pending",
    });

    res.status(201).json({
      success: true,
      message: "User kit created as draft",
      data: userKit,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ------------------------------------
// GET /api/user-kits/my-kits
// Get my kits, default draft
// ------------------------------------
export const getMyKits = async (req, res) => {
  try {
    const { status = "draft" } = req.query;

    const filter = {
      user: req.user._id,
    };

    if (status !== "all") {
      filter.status = status;
    }

    const kits = await UserKit.find(filter)
      .populate("items.product", "title slug pricing media")
      .populate("baseKit", "name slug image")
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: kits.length,
      data: kits,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ------------------------------------
// POST /api/user-kits/:userKitId/checkout
// Checkout draft kit. If payment is not paid, keep as draft.
// ------------------------------------
export const checkoutUserKit = async (req, res) => {
  try {
    const { userKitId } = req.params;
    const {
      paymentMethod = "COD",
      paymentStatus = "pending",
      address,
    } = req.body;

    const userKit = await UserKit.findOne({
      _id: userKitId,
      user: req.user._id,
    }).populate("items.product");

    if (!userKit) {
      return res.status(404).json({
        success: false,
        message: "User kit not found",
      });
    }

    if (userKit.status === "ordered") {
      return res.status(400).json({
        success: false,
        message: "This kit is already checked out",
      });
    }

    if (paymentStatus !== "paid") {
      userKit.status = "draft";
      userKit.paymentStatus = paymentStatus;
      await userKit.save();

      return res.json({
        success: true,
        message: "Payment not completed. Kit remains in draft.",
        data: userKit,
      });
    }

    const items = userKit.items.map((item) => ({
      productType: "Item",
      product: item.product._id,
      quantity: item.quantity,
      price: item.priceAtTime,
    }));

    const finalAddress = {
      name: address?.name || req.user.name,
      phone: address?.phone || req.user.phone,
      fullAddress: address?.fullAddress || "",
      city: address?.city || "",
      state: address?.state || "",
      pincode: address?.pincode || "",
    };

    const order = await Order.create({
      user: req.user._id,
      items,
      totalAmount: userKit.totalPrice,
      paymentMethod,
      address: finalAddress,
      paymentStatus: "Paid",
    });

    userKit.status = "ordered";
    userKit.paymentStatus = "paid";
    userKit.order = order._id;
    await userKit.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully from user kit",
      data: {
        order,
        userKit,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};