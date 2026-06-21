const mongoose = require('mongoose');

const bankDetailSchema = new mongoose.Schema(
  {
    bankName: { type: String },
    accountName: { type: String },
    accountNumber: { type: String },
    sortCode: { type: String },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  logo: { type: String },
  address: { type: String },
  phone: { type: String },
  whatsapp: { type: String },
  email: { type: String },
  website: { type: String },
  cacNumber: { type: String },
  tin: { type: String },
  vat: { type: String },
  bankDetails: [bankDetailSchema],
  paymentInstructions: { type: String },
  signature: { type: String },
  stamp: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Company', companySchema);
