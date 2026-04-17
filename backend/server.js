import "dotenv/config";
import app, { bootstrapApp } from "./app.js";

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await bootstrapApp();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});