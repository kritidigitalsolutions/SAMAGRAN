import jwt from "jsonwebtoken";
import DeliveryBoy from "../models/deliveryBoy.model.js";

export const protectDelivery = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.role !== "delivery") {
      return res.status(403).json({ message: "Access denied" });
    }

    const deliveryBoy = await DeliveryBoy.findById(decoded.id).lean();

    if (!deliveryBoy) {
      return res.status(401).json({ message: "Delivery boy not found" });
    }

    if (deliveryBoy.status !== "active") {
      return res.status(403).json({ message: "Delivery boy is inactive" });
    }

    req.deliveryBoy = deliveryBoy;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
