import jwt from "jsonwebtoken";

const generateToken = (userId, isAdmin = false, extraPayload = {}) => {
  return jwt.sign(
    { id: userId, isAdmin, ...extraPayload },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    }
  );
};

export default generateToken;
