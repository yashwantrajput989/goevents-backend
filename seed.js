const mongoose = require('mongoose');
const Show = require('./models/Show');
require('dotenv').config();

const demoShows = [
  {
    title: "Interstellar: The IMAX Experience",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop",
    category: "Movie",
    genre: ["Sci-Fi", "Drama", "Adventure"],
    rating: 8.7,
    language: "English",
    price: 450,
    duration: "2h 49m",
    releaseDate: new Date('2024-05-15'),
    trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E"
  },
  {
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?q=80&w=2070&auto=format&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1974&auto=format&fit=crop",
    category: "Movie",
    genre: ["Sci-Fi", "Action"],
    rating: 8.9,
    language: "English",
    price: 550,
    duration: "2h 46m",
    releaseDate: new Date('2024-03-01'),
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w"
  },
  {
    title: "Coldplay: Music of the Spheres",
    description: "Experience the magic of Coldplay live in concert with stunning visuals and immersive sound.",
    poster: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1974&auto=format&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop",
    category: "Concert",
    genre: ["Rock", "Pop"],
    rating: 9.5,
    language: "English",
    price: 2500,
    duration: "3h 0m",
    releaseDate: new Date('2024-06-20'),
    trailerUrl: ""
  },
  {
    title: "John Wick: Chapter 4",
    description: "John Wick uncovers a path to defeating The High Table. But before he can earn his freedom, Wick must face off against a new enemy.",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop",
    backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop",
    category: "Movie",
    genre: ["Action", "Thriller"],
    rating: 7.8,
    language: "English",
    price: 350,
    duration: "2h 49m",
    releaseDate: new Date('2024-04-10'),
    trailerUrl: ""
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ingo_tickets');
    await Show.deleteMany({});
    await Show.insertMany(demoShows);
    console.log('Database seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDB();
