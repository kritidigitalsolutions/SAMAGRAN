import "dotenv/config";
import app, { bootstrapApp } from "../app.js";

const handler = async (req, res) => {
  try {
    await bootstrapApp();
    return app(req, res);
  } catch (error) {
    console.error("Startup Error:", error.message);

    return res.status(500).json({
      message: "Server startup failed",
      ...(process.env.NODE_ENV === "production" ? {} : { error: error.message }),
    });
  }
};

export default handler;
