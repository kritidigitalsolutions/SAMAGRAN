import UserKit from "../models/userKit.model.js";
import FestivalKit from "../models/festivalKit.model.js";
import Item from "../models/item.model.js";
import Order from "../models/order.model.js";

// ------------------------------------
// Helper: Build items + calculate total
// ------------------------------------
const buildItemsAndTotal = async (items) => {
  let finalItems = [];
  let totalPrice = 0;

  for (const row of items) {
    const { slug, quantity } = row;

    if (!slug) {
      throw new Error("Product slug is required");
    }

    const product = await Item.findOne({
      slug,
      status: "active",
    });

    if (!product) {
      throw new Error(`Product not found: ${slug}`);
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
// POST /api/user-kits/order-from-kit/:kitSlug
// Save customized festival kit
// ------------------------------------
export const orderFromKit = async (req, res) => {
  try {
    const { kitSlug } = req.params;
    const { items = [] } = req.body;

    const baseKit = await FestivalKit.findOne({
      slug: kitSlug,
    });

    if (!baseKit) {
      return res.status(404).json({
        success: false,
        message: "Festival kit not found",
      });
    }

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
      name: baseKit.name,
      baseKit: baseKit._id,
      items: finalItems,
      totalPrice,
      status: "saved",
    });

    res.status(201).json({
      success: true,
      message: "Festival kit saved successfully",
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
// POST /api/user-kits/custom-order
// Save custom named kit
// ------------------------------------
export const customOrder = async (req, res) => {
  try {
    const { name, items = [] } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Kit name is required",
      });
    }

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
      items: finalItems,
      totalPrice,
      status: "saved",
    });

    res.status(201).json({
      success: true,
      message: "Custom kit saved successfully",
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
// GET /api/user-kits/my-orders
// Get saved kits
// ------------------------------------
export const getMyKits = async (req, res) => {
  try {
    const kits = await UserKit.find({
      user: req.user._id,
      status: "saved",
    })
      .populate("items.product", "title slug pricing media")
      .populate("baseKit", "name slug image");

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
// POST /api/user-kits/checkout/:userKitId
// Create real order from saved user kit
// ------------------------------------
export const checkoutUserKit = async (req, res) => {
  try {
    const { userKitId } = req.params;
    const { paymentMethod = "COD", address } = req.body;

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
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully from user kit",
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};