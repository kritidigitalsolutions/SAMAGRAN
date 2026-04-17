import jwt from "jsonwebtoken";
import Pandit from "../models/pandit.model.js";

export const protectPandit = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.role !== "pandit") {
      return res.status(403).json({
        success: false,
        message: "Pandit access only",
      });
    }

    const pandit = await Pandit.findById(decoded.id);

    if (!pandit) {
      return res.status(401).json({
        success: false,
        message: "Pandit not found",
      });
    }

    req.pandit = pandit;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
