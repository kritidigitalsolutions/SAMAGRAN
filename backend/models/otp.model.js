// import mongoose from "mongoose";

// const otpSchema = new mongoose.Schema(
//   {
//     phone: {
//       type: String,
//       required: true,
//     },
//     otp: {
//       type: String,
//       required: true,
//     },
//     expiresAt: {
//       type: Date,
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.model("OTP", otpSchema);


import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, default: null },

    // temporary signup data
    name: String,
    email: String,
    address: String,
    profileImage: String,
    type: {
      type: String,
      enum: ["signup", "login"],
      default: "signup",
    },
  },
  { timestamps: true }
);

export default mongoose.model("OTP", otpSchema);