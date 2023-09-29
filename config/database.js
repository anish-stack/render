
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const uri = "mongodb+srv://ownerdgmtech:jCtH6g3WW06HZ2Om@cluster0.ozjuanl.mongodb.net/?retryWrites=true&w=majority"; // Replace with your MongoDB URI from config

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 200000, // Increased timeout to 60 seconds
    });
    console.log("Connected to the database successfully!");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
};

module.exports = connectDB;
