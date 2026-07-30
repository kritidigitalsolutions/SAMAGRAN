import "dotenv/config";
import app, { bootstrapApp } from "./app.js";

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await bootstrapApp();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Auto-cancellation background schedule
    import("./controllers/panditBooking.controller.js")
      .then(({ autoCancelExpiredBookings }) => {
        // Run once on startup
        autoCancelExpiredBookings().catch((err) => {
          console.error("Startup auto-cancellation check error:", err.message || err);
        });

        // Set up recurring check every 5 minutes
        setInterval(() => {
          autoCancelExpiredBookings().catch((err) => {
            console.error("Recurring auto-cancellation check error:", err.message || err);
          });
        }, 5 * 60 * 1000);
      })
      .catch((err) => {
        console.error("Failed to import auto-cancellation helper on startup:", err.message || err);
      });
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});

