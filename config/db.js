const mongoose = require("mongoose");

const dbURL = "mongodb://127.0.0.1:27017/itmi1210_pj";

mongoose
  .connect(dbURL, {})
  .catch((err) => console.error("Connection Error:", err));

mongoose.connection.on("connected", () => console.log("MongoDB Connected"));

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔴 MongoDB connection closed");
  process.exit(0);
});
