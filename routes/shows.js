const express = require('express');
const router = express.Router();
const Show = require('../models/Show');

// Get all shows
router.get('/', async (req, res) => {
  try {
    const shows = await Show.find().sort({ releaseDate: -1 });
    res.json(shows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single show
router.get('/:id', async (req, res) => {
  try {
    const show = await Show.findById(req.params.id);
    if (!show) return res.status(404).json({ message: 'Show not found' });
    res.json(show);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
