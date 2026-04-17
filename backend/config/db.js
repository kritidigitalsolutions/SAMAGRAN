import mongoose from "mongoose";

let connectPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is not set");
    }

    connectPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    await connectPromise;
    console.log("MongoDB Connected");
    return mongoose.connection;
  } catch (error) {
    connectPromise = undefined;
    console.error("DB Error:", error.message);
    throw error;
  }
};

export default connectDB;