const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI env variable is not set — database features will not work');
    return;
  }
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection FAILED: ${error.message}`);
    console.error('Check: 1) MONGODB_URI is correct  2) Atlas IP whitelist includes 0.0.0.0/0');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
