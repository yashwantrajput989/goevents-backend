const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  poster: { type: String, required: true },
  backdrop: { type: String, required: true },
  category: { type: String, required: true }, // e.g., Movie, Concert
  genre: [String],
  rating: { type: Number, default: 0 },
  language: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: String, required: true },
  releaseDate: { type: Date, required: true },
  trailerUrl: String
});

module.exports = mongoose.model('Show', showSchema);
