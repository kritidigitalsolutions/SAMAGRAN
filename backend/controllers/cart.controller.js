import Cart from "../models/cart.model.js";
import Item from "../models/product.model.js";
import FestivalKit from "../models/festivalKit.model.js";
import DefaultKit from "../models/defaultKit.model.js";
import UserKit from "../models/userKit.model.js";

const CART_PRODUCT_POPULATE = {
  path: "product",
  strictPopulate: false,
  populate: [
    {
      path: "items.product",
      strictPopulate: false,
    },
    {
      path: "baseKit",
      strictPopulate: false,
      populate: {
        path: "items.product",
        strictPopulate: false,
      },
    },
  ],
};

const buildCartResponse = (cartItems = []) => {
  const total = cartItems.reduce((sum, item) => {
    return sum + item.priceAtAdd * item.quantity;
  }, 0);

  return {
    count: cartItems.length,
    total,
    data: cartItems,
  };
};

// ADD / INCREMENT
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId and productType required",
      });
    }

    let cart = await Cart.findOne({
      user: userId,
      product: productId,
    });

    if (cart) {
      cart.quantity += 1;
      await cart.save();
    } else {
      let price = 0;



      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Unable to add product with invalid price",
        });
      }

      cart = await Cart.create({
        user: userId,
        product: productId,
        quantity: 1,
        priceAtAdd: price,
      });
    }

    const populatedCartItem = await cart.populate(CART_PRODUCT_POPULATE);

    res.json({
      success: true,
      message: "Quantity increased",
      data: populatedCartItem,
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
    const { productId } = req.body;

    const cart = await Cart.findOne({
      user: userId,
      product: productId,
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

    const updatedCart = await Cart.find({
      user: userId,
    }).populate(CART_PRODUCT_POPULATE);

    const cartSummary = buildCartResponse(updatedCart);

    res.json({
      success: true,
      message: "Quantity decreased",
      ...cartSummary,
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
    }).populate(CART_PRODUCT_POPULATE);

    const cartSummary = buildCartResponse(cart);

    res.json({
      success: true,
      ...cartSummary,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};