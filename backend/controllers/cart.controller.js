import Cart from "../models/cart.model.js";
import Item from "../models/item.model.js";
import FestivalKit from "../models/festivalKit.model.js";

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