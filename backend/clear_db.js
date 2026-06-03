import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://samagran2026_db_user:nZkTGyexgsI53Ryn@cluster0.aohrfvs.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI).then(async () => {
  console.log("Connected to MongoDB");
  
  const resultVendors = await mongoose.connection.db.collection("vendors").deleteMany({});
  console.log("Deleted vendors:", resultVendors.deletedCount);
  
  const resultAdmins = await mongoose.connection.db.collection("admins").deleteMany({ email: { $ne: "admin@gmail.com" } });
  console.log("Deleted non-super admins:", resultAdmins.deletedCount);
  
  process.exit(0);
}).catch(console.error);
