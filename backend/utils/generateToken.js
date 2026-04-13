import jwt from "jsonwebtoken";

const generateToken = (userId, isAdmin = false) => {
  return jwt.sign(
    { id: userId, isAdmin },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7h",
    }
  );
};

export default generateToken;
