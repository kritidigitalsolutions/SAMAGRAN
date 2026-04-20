import Cart from "../models/cart.model.js";
import Item from "../models/product.model.js";
import FestivalKit from "../models/festivalKit.model.js";
import DefaultKit from "../models/defaultKit.model.js";
import UserKit from "../models/userKit.model.js";

// ADD / INCREMENT
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, productType } = req.body;

    if (!productId || !productType) {
      return res.status(400).json({
        success: false,
        message: "productId and productType required",
      });
    }

    let cart = await Cart.findOne({
      user: userId,
      product: productId,
      productType,
    });

    if (cart) {
      cart.quantity += 1;
      await cart.save();
    } else {
      let price = 0;

      if (productType === "Item") {
        const item = await Item.findById(productId);

        if (!item || item.status !== "active") {
          return res.status(404).json({
            success: false,
            message: "Item not found",
          });
        }

        if (item.stock.quantity < 1) {
          return res.status(400).json({
            success: false,
            message: "Out of stock",
          });
        }

        price = item.pricing.price;
      }

      if (productType === "FestivalKit") {
        const kit = await FestivalKit.findById(productId);

        if (!kit) {
          return res.status(404).json({
            success: false,
            message: "Kit not found",
          });
        }

        price = kit.kitPrice;
      }

      if (productType === "DefaultKit") {
        const kit = await DefaultKit.findOne({ _id: productId, status: "active" });

        if (!kit) {
          return res.status(404).json({
            success: false,
            message: "Default kit not found",
          });
        }

        price = kit.kitPrice || kit.totalPrice || 0;
      }

      if (productType === "UserKit") {
        const userKit = await UserKit.findOne({ _id: productId, user: userId });

        if (!userKit) {
          return res.status(404).json({
            success: false,
            message: "User kit not found",
          });
        }

        if (userKit.status === "ordered") {
          return res.status(400).json({
            success: false,
            message: "Ordered user kit cannot be added to cart",
          });
        }

        price = userKit.totalPrice || 0;
      }

      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Unable to add product with invalid price",
        });
      }

      cart = await Cart.create({
        user: userId,
        product: productId,
        productType,
        quantity: 1,
        priceAtAdd: price,
      });
    }

    res.json({
      success: true,
      message: "Quantity increased",
      data: cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// REMOVE / DECREMENT
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, productType } = req.body;

    const cart = await Cart.findOne({
      user: userId,
      product: productId,
      productType,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Item not in cart",
      });
    }

    if (cart.quantity > 1) {
      cart.quantity -= 1;
      await cart.save();
    } else {
      await cart.deleteOne();
    }

    res.json({
      success: true,
      message: "Quantity decreased",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET CART
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.find({
      user: req.user._id,
    }).populate("product");

    const total = cart.reduce((sum, item) => {
      return sum + item.priceAtAdd * item.quantity;
    }, 0);

    res.json({
      success: true,
      count: cart.length,
      total,
      data: cart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};