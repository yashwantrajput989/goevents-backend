const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    name: String,
    email: String,
    picture: String
  },
  show: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Show',
    required: true
  },
  showDetails: {
    title: String,
    poster: String,
    price: Number
  },
  tickets: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paymentIntentId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  qrData: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
