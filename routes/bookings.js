const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// Create a new booking
router.post('/', async (req, res) => {
  const { user, showId, showDetails, tickets, totalAmount, paymentIntentId } = req.body;

  try {
    const qrData = `INGO-${Date.now()}-${user.email}`;
    const newBooking = new Booking({
      user,
      show: showId,
      showDetails,
      tickets,
      totalAmount,
      paymentIntentId,
      qrData,
      status: 'completed'
    });

    const savedBooking = await newBooking.save();
    res.status(201).json(savedBooking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's tickets
router.get('/my-tickets', async (req, res) => {
  const { email } = req.query;
  try {
    const bookings = await Booking.find({ 'user.email': email }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
