import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://samagran2026_db_user:nZkTGyexgsI53Ryn@cluster0.aohrfvs.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI).then(async () => {
  console.log("Connected to MongoDB");
  const vendors = await mongoose.connection.db.collection("vendors").find({}).toArray();
  console.log("Vendors count:", vendors.length);
  vendors.forEach(v => console.log(v.email, v.phone));
  
  const admins = await mongoose.connection.db.collection("admins").find({}).toArray();
  console.log("Admins count:", admins.length);
  admins.forEach(a => console.log(a.email));
  
  process.exit(0);
}).catch(console.error);
