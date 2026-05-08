// import Cart from "../models/cart.model.js";
// import Item from "../models/product.model.js";
// import FestivalKit from "../models/festivalKit.model.js";

// const CART_PRODUCT_POPULATE = {
//   path: "product",
//   strictPopulate: false,
//   populate: [
//     {
//       path: "items.product",
//       strictPopulate: false,
//     },
//     {
//       path: "baseKit",
//       strictPopulate: false,
//       populate: {
//         path: "items.product",
//         strictPopulate: false,
//       },
//     },
//   ],
// };

// const buildCartResponse = (cartItems = []) => {
//   const total = cartItems.reduce((sum, item) => {
//     return sum + item.priceAtAdd * item.quantity;
//   }, 0);

//   return {
//     count: cartItems.length,
//     total,
//     data: cartItems,
//   };
// };

// // ADD / INCREMENT
// export const addToCart = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { productId } = req.body;

//     if (!productId) {
//       return res.status(400).json({
//         success: false,
//         message: "productId and productType required",
//       });
//     }

//     let cart = await Cart.findOne({
//       user: userId,
//       product: productId,
//     });

//     if (cart) {
//       cart.quantity += 1;
//       await cart.save();
//     } else {
//       let price = 0;



//       if (price <= 0) {
//         return res.status(400).json({
//           success: false,
//           message: "Unable to add product with invalid price",
//         });
//       }

//       cart = await Cart.create({
//         user: userId,
//         product: productId,
//         quantity: 1,
//         priceAtAdd: price,
//       });
//     }

//     const populatedCartItem = await cart.populate(CART_PRODUCT_POPULATE);

//     res.json({
//       success: true,
//       message: "Quantity increased",
//       data: populatedCartItem,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // REMOVE / DECREMENT
// export const removeFromCart = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { productId } = req.body;

//     const cart = await Cart.findOne({
//       user: userId,
//       product: productId,
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Item not in cart",
//       });
//     }

//     if (cart.quantity > 1) {
//       cart.quantity -= 1;
//       await cart.save();
//     } else {
//       await cart.deleteOne();
//     }

//     const updatedCart = await Cart.find({
//       user: userId,
//     }).populate(CART_PRODUCT_POPULATE);

//     const cartSummary = buildCartResponse(updatedCart);

//     res.json({
//       success: true,
//       message: "Quantity decreased",
//       ...cartSummary,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // GET CART
// export const getCart = async (req, res) => {
//   try {
//     const cart = await Cart.find({
//       user: req.user._id,
//     }).populate(CART_PRODUCT_POPULATE);

//     const cartSummary = buildCartResponse(cart);

//     res.json({
//       success: true,
//       ...cartSummary,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// export const deleteCart = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { productId } = req.params;

//     // Validate productId
//     if (!mongoose.Types.ObjectId.isValid(productId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid productId",
//       });
//     }

//     // Find and delete cart item
//     const deletedItem = await Cart.findOneAndDelete({
//       user: userId,
//       product: productId,
//     });

//     if (!deletedItem) {
//       return res.status(404).json({
//         success: false,
//         message: "Item not found in cart",
//       });
//     }

//     // Get updated cart
//     const updatedCart = await Cart.find({ user: userId }).populate({
//       path: "product",
//       strictPopulate: false,
//     });

//     const total = updatedCart.reduce((sum, item) => {
//       return sum + item.priceAtAdd * item.quantity;
//     }, 0);

//     return res.json({
//       success: true,
//       message: "Item removed from cart",
//       count: updatedCart.length,
//       total,
//       data: updatedCart,
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };


// export const clearCart = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     await Cart.deleteMany({ user: userId });

//     return res.json({
//       success: true,
//       message: "Cart cleared successfully",
//       count: 0,
//       total: 0,
//       data: [],
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };


import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import Item from "../models/product.model.js";
import FestivalKit from "../models/festivalKit.model.js";

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

const toMoney = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : NaN;
};

// Resolve product and price from real schema fields across all supported models.
const getProductDetails = async (productId) => {
  let product = await Item.findOne({ _id: productId, status: "active" });
  if (product) return { product, price: toMoney(product.pricing?.price), productType: "Item" };

  product = await FestivalKit.findById(productId);
  if (product) {
    return {
      product,
      price: toMoney(product.kitPrice ?? product.totalPrice),
      productType: "FestivalKit",
    };
  }

  return null;
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

// ==========================
// ADD / INCREMENT
// ==========================
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    const parsedQuantity = Number(quantity);
    const quantityToAdd =
      Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId required",
      });
    }

    // 👉 Validate ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid productId",
      });
    }

    // 👉 Check already in cart
    let cart = await Cart.findOne({
      user: userId,
      product: productId,
    });

    if (cart) {
      cart.quantity += quantityToAdd;
      await cart.save();

      const populated = await cart.populate(CART_PRODUCT_POPULATE);

      return res.json({
        success: true,
        message: "Quantity updated",
        data: populated,
      });
    }

    // 👉 Get product + price
    const productData = await getProductDetails(productId);

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const { price, productType } = productData;

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product price",
      });
    }

    // 👉 Create cart
    cart = await Cart.create({
      user: userId,
      productType,
      product: productId,
      quantity: quantityToAdd,
      priceAtAdd: price,
    });

    const populatedCartItem = await cart.populate(CART_PRODUCT_POPULATE);

    return res.json({
      success: true,
      message: "Product added to cart",
      data: populatedCartItem,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// REMOVE / DECREMENT
// ==========================
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity, productType } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid productId",
      });
    }

    const parsedQuantity = Number(quantity);
    const quantityToRemove =
      Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    const lookup = {
      user: userId,
      $or: [{ product: productId }, { _id: productId }],
    };

    if (productType) {
      lookup.productType = productType;
    }

    const cart = await Cart.findOne(lookup);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Item not in cart",
      });
    }

    if (cart.quantity > quantityToRemove) {
      cart.quantity -= quantityToRemove;
      await cart.save();
    } else {
      await cart.deleteOne();
    }

    const updatedCart = await Cart.find({ user: userId }).populate(
      CART_PRODUCT_POPULATE
    );

    return res.json({
      success: true,
      message: "Quantity decreased",
      ...buildCartResponse(updatedCart),
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// GET CART
// ==========================
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.find({
      user: req.user._id,
    }).populate(CART_PRODUCT_POPULATE);

    return res.json({
      success: true,
      ...buildCartResponse(cart),
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// DELETE SINGLE ITEM
// ==========================
export const deleteCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid productId",
      });
    }

    const deletedItem = await Cart.findOneAndDelete({
      user: userId,
      product: productId,
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    const updatedCart = await Cart.find({ user: userId }).populate(
      CART_PRODUCT_POPULATE
    );

    return res.json({
      success: true,
      message: "Item removed from cart",
      ...buildCartResponse(updatedCart),
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================
// CLEAR CART
// ==========================
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    await Cart.deleteMany({ user: userId });

    return res.json({
      success: true,
      message: "Cart cleared successfully",
      count: 0,
      total: 0,
      data: [],
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};