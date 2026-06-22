const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure Hostinger SMTP Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@gooevents.in',
    pass: 'Gooevents@008',
  },
  tls: {
    rejectUnauthorized: false
  }
});

// --- Observability In-Memory Logs Interceptor ---
const recentLogs = [];
const MAX_LOGS = 100;

function addLog(type, message) {
  const timestamp = new Date().toISOString();
  recentLogs.push({ timestamp, type, message });
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.shift();
  }
}

const originalLog = console.log;
console.log = function (...args) {
  originalLog.apply(console, args);
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  addLog('INFO', msg);
};

const originalError = console.error;
console.error = function (...args) {
  originalError.apply(console, args);
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  addLog('ERROR', msg);
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Goo Events Unified API is running. Visit the frontend link to view the app.');
});

// MySQL Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'goo_events',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Fallback Mock Datasets when MySQL is offline
const MOCK_COMPANIES = [
  {
    id: 'comp_test_1',
    name: 'DJ Shadow & Rave-X',
    admin_user_id: 'test-admin-123',
    city: 'Mumbai',
    description: 'DJ Shadow is a pioneer of electronic music, specializing in techno and tech-house sets.',
    website: 'https://djshadow.com',
    contact_email: 'shadow@gooevents.com',
    phone: '9876543210',
    payout_upi: 'shadow@upi',
    verified: 1,
    category: 'DJ',
    genres: JSON.stringify(['Techno', 'House']),
    gallery_images: JSON.stringify([
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000'
    ]),
    video_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    booking_price: 25000.00,
    social_links: JSON.stringify({ instagram: 'https://instagram.com/djshadow', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
  },
  {
    id: 'comp_test_2',
    name: 'Aria Woods & The Band',
    admin_user_id: null,
    city: 'Visakhapatnam',
    description: 'Aria Woods is an indie-pop singer and acoustic songwriter known for her soulful voice.',
    website: 'https://ariawoods.music',
    contact_email: 'aria@gooevents.com',
    phone: '9988776655',
    payout_upi: 'aria@upi',
    verified: 1,
    category: 'Singer',
    genres: JSON.stringify(['Acoustic', 'Indie-Pop', 'Soul']),
    gallery_images: JSON.stringify([
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000',
      'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000'
    ]),
    video_url: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    booking_price: 18000.00,
    social_links: JSON.stringify({ instagram: 'https://instagram.com/ariawoods', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
  },
  {
    id: 'comp_test_3',
    name: 'Rohan Joshi',
    admin_user_id: null,
    city: 'Mumbai',
    description: "Rohan Joshi is one of India's finest stand-up comedians.",
    website: 'https://rohanjoshi.com',
    contact_email: 'rohan@gooevents.com',
    phone: '9820098200',
    payout_upi: 'rohan@upi',
    verified: 1,
    category: 'Comedian',
    genres: JSON.stringify(['Comedy', 'Standup']),
    gallery_images: JSON.stringify([
      'https://images.unsplash.com/photo-1585699324551-f6c309eedee5?q=80&w=1000'
    ]),
    video_url: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    booking_price: 35000.00,
    social_links: JSON.stringify({ instagram: 'https://instagram.com/rohanjoshi', youtube: '', spotify: '' })
  }
];

const MOCK_EVENTS = [
  {
    id: 'ev_cyber_rave_mumbai',
    company_id: 'comp_test_1',
    title: 'Cyberpunk Rooftop Rave',
    short_description: 'A neon-drenched night of futuristic beats and high-octane vibes.',
    description: 'Get ready for the most immersive cyberpunk rave Mumbai has ever witnessed. We are taking over the highest rooftop for a night of underground techno, custom-built laser displays, and high-energy synthesizers. Experience an elite lineup of techno artists.',
    venue_name: 'The Neon Nest Loft',
    city: 'Mumbai',
    category: 'Music',
    price: 999.00,
    cover_image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000',
    start_date: '2026-06-25T21:00:00.000Z',
    status: 'published',
    tickets_sold: 45,
    ticket_types: JSON.stringify([
      { id: 't-vip', name: 'VIP Access (Backstage + Drink)', price: 1999, benefits: ['Exclusive loft access', 'Meet and greet', 'Complimentary drink ticket'] },
      { id: 't-ga', name: 'General Admission', price: 999, benefits: ['Standard entry', 'High-energy main dancefloor'] }
    ])
  },
  {
    id: 'ev_comedy_standup_vizag',
    company_id: 'comp_test_3',
    title: 'Standup Comedy Showdown',
    short_description: "Pure observational wit and hilarious punchlines from India's top comedians.",
    description: 'A laughing riot incoming to Visakhapatnam! Bring your friends and family for an evening filled with absolute humor, hilarious storytelling, and pure comedy genius.',
    venue_name: 'The Laugh Club Cafe',
    city: 'Visakhapatnam',
    category: 'comedy',
    price: 499.00,
    cover_image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedee5?q=80&w=1000',
    start_date: '2026-06-28T19:00:00.000Z',
    status: 'published',
    tickets_sold: 23,
    ticket_types: JSON.stringify([
      { id: 't-front-row', name: 'Front Row Premium', price: 799, benefits: ['Guaranteed front row seating', 'Free mocktail/soft drink'] },
      { id: 't-reg', name: 'Standard Seat', price: 499, benefits: ['Standard general seating'] }
    ])
  },
  {
    id: 'ev_wellness_camp_vizag',
    company_id: 'comp_test_2',
    title: 'Sunset Yoga & Sound Healing',
    short_description: 'Align your mind, body, and spirit by the beach during a stunning golden hour.',
    description: 'Rejuvenate your soul with a meditation masterclass at the beach during sunset. This wellness workshop combines Vinyasa yoga flows with live ambient acoustic handpan and sound bowls therapy.',
    venue_name: 'Bayview Sands Resort',
    city: 'Visakhapatnam',
    category: 'wellness',
    price: 799.00,
    cover_image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000',
    start_date: '2026-06-30T17:00:00.000Z',
    status: 'published',
    tickets_sold: 12,
    ticket_types: JSON.stringify([
      { id: 't-yoga-pass', name: 'Full Workshop Pass', price: 799, benefits: ['Premium yoga mat usage', 'Sound bath session'] }
    ])
  }
];

const MOCK_VENUES = [
  { id: 'v_blue_coffee', name: 'The Blue Coffee', city: 'Mumbai', capacity: 120, price: 10000, description: 'Charming coffee shop with a cozy acoustic stage.', cover_image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1000' },
  { id: 'v_loft_space', name: 'The Loft Space', city: 'Mumbai', capacity: 300, price: 15000, description: 'Industrial design loft space with great acoustics and stage lights.', cover_image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000' },
  { id: 'v_studio_27', name: 'Studio 27', city: 'Visakhapatnam', capacity: 60, price: 6000, description: 'Intimate studio for standup comedy and workshops.', cover_image: 'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000' }
];

// File Upload Setup with safe validation
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Safe Upload Endpoint
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ url: filePath, message: 'Image uploaded successfully' });
  });
});

// Database Seeding Logic
async function seedMySQLData(connection) {
  // Verify default profiles
  const [profiles] = await connection.query("SELECT id FROM profiles WHERE id = ?", ['test-admin-123']);
  if (profiles.length === 0) {
    console.log("Seeding default profiles...");
    await connection.query(`
      INSERT INTO profiles (id, full_name, username, email, avatar_url, role, city, phone, onboarded, interests, password, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'test-admin-123',
      'Demo Admin',
      'demoadmin',
      'admin@ingo.in',
      null,
      'admin',
      'Mumbai',
      '9876543210',
      true,
      JSON.stringify(['Music', 'Comedy']),
      'gooevents1234',
      true
    ]);
  } else {
    await connection.query(`
      UPDATE profiles SET password = ?, email_verified = true WHERE id = ?
    `, ['gooevents1234', 'test-admin-123']);
  }

  const [superadmin] = await connection.query("SELECT id FROM profiles WHERE id = ?", ['superadmin-123']);
  if (superadmin.length === 0) {
    console.log("Seeding default Super Admin...");
    await connection.query(`
      INSERT INTO profiles (id, full_name, username, email, avatar_url, role, city, phone, onboarded, interests, password, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'superadmin-123',
      'Super Admin',
      'superadmin',
      'superadmin@gooevents.com',
      null,
      'superadmin',
      'Mumbai',
      '9999999999',
      true,
      JSON.stringify([]),
      'gooevents1234',
      true
    ]);
  }

  // Seed default companies (Artists) by ID
  console.log("Verifying default companies (Artists)...");
  const demoCompanies = [
    [
      'comp_test_1',
      'DJ Shadow & Rave-X',
      'test-admin-123',
      'Mumbai',
      'DJ Shadow is a pioneer of underground techno and electronic music. Having performed at international music festivals, Shadow brings high energy cyberpunk sets and lasers directly to the floor.',
      'https://djshadow.com',
      'shadow@gooevents.com',
      '9876543210',
      'shadow@upi',
      true,
      'DJ',
      JSON.stringify(['Techno', 'Cyberpunk', 'House']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000',
        'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      25000.00,
      JSON.stringify({ instagram: 'https://instagram.com/djshadow', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
    ],
    [
      'comp_test_2',
      'Aria Woods & The Band',
      null,
      'Visakhapatnam',
      'Aria Woods is an indie-pop singer and acoustic songwriter known for her soulful voice and melodic soundscapes that capture the essence of coastal vibes.',
      'https://ariawoods.music',
      'aria@gooevents.com',
      '9988776655',
      'aria@upi',
      true,
      'Singer',
      JSON.stringify(['Acoustic', 'Indie-Pop', 'Soul']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000',
        'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=Way9Dexny3w',
      18000.00,
      JSON.stringify({ instagram: 'https://instagram.com/ariawoods', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
    ],
    [
      'comp_test_3',
      'Rohan Joshi',
      null,
      'Mumbai',
      'Rohan Joshi is one of India\'s finest stand-up comedians. His observational style and sharp punchlines make him a platform-favorite, discussing everything from career paths to millennial life.',
      'https://rohanjoshi.com',
      'rohan@gooevents.com',
      '9820098200',
      'rohan@upi',
      true,
      'Comedian',
      JSON.stringify(['Observational Comedy', 'Standup']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1585699324551-f6c309eedee5?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=Way9Dexny3w',
      35000.00,
      JSON.stringify({ instagram: 'https://instagram.com/rohanjoshi', youtube: 'https://youtube.com', spotify: '' })
    ],
    [
      'vhop_official',
      'Goo Events Host',
      null,
      'Mumbai',
      'Goo Events official master host team. Coordinating and organizing city-wide live experiences.',
      'https://gooevents.com',
      'host@gooevents.com',
      '9000000000',
      'gooevents@upi',
      true,
      'Host',
      JSON.stringify(['Event Host', 'MC']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000'
      ]),
      '',
      50000.00,
      JSON.stringify({ instagram: '', youtube: '', spotify: '' })
    ],
    [
      'comp_neha_sharma',
      'Neha Sharma',
      null,
      'Hyderabad',
      'Neha Sharma is a versatile singer with 6+ years of experience in live shows, weddings, and corporate events. Known for her powerful Bollywood vocals and mesmerizing stage presence.',
      'https://nehasharma.music',
      'neha@gooevents.com',
      '9912345678',
      'neha@upi',
      true,
      'Singer',
      JSON.stringify(['Bollywood', 'Sufi', 'Indie']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1000',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=Way9Dexny3w',
      15000.00,
      JSON.stringify({ instagram: 'https://instagram.com/nehasharma', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
    ],
    [
      'comp_local_train',
      'The Local Train',
      null,
      'Mumbai',
      'The Local Train is a four-piece alternative rock band blending Indian influences with Fusion sound. Known for their energetic live shows and soulful music across 250+ shows.',
      'https://thelocaltrainband.com',
      'localtrainband@gooevents.com',
      '9845123456',
      'localtrain@upi',
      true,
      'Band',
      JSON.stringify(['Fusion', 'Hindi', 'English', 'Indie']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1000',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      80000.00,
      JSON.stringify({ instagram: 'https://instagram.com/thelocaltrainband', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
    ],
    [
      'comp_priya_dance',
      'Priya Dance Academy',
      null,
      'Bangalore',
      'Priya Dance Academy offers breathtaking Bharatanatyam and Contemporary fusion performances for corporate events, weddings, and cultural festivals. Led by award-winning choreographer Priya Nair.',
      'https://priyadance.in',
      'priya@gooevents.com',
      '9987654321',
      'priya@upi',
      true,
      'Dancer',
      JSON.stringify(['Bharatanatyam', 'Contemporary', 'Fusion']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1000',
        'https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=Way9Dexny3w',
      22000.00,
      JSON.stringify({ instagram: 'https://instagram.com/priyadance', youtube: 'https://youtube.com', spotify: '' })
    ],
    [
      'comp_sitar_maestro',
      'Ravi Shankar Jr.',
      null,
      'Hyderabad',
      'A classically trained sitar maestro with 15 years of performance experience at prestigious venues across India and abroad. Specializes in Hindustani classical and fusion concerts.',
      'https://ravishankarjr.com',
      'ravi@gooevents.com',
      '9756123456',
      'ravi@upi',
      true,
      'Instrumentalist',
      JSON.stringify(['Hindustani', 'Carnatic', 'Classical Fusion']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=1000',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=Way9Dexny3w',
      40000.00,
      JSON.stringify({ instagram: 'https://instagram.com/ravishankarjr', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
    ],
    [
      'comp_dj_blaze',
      'DJ Blaze',
      null,
      'Bangalore',
      'DJ Blaze is a top-10 EDM DJ in India, famous for his explosive Bollywood remixes and pumping commercial house sets. Perfect for college fests, nightclubs, and large concerts.',
      'https://djblaze.in',
      'blaze@gooevents.com',
      '9866789012',
      'blaze@upi',
      true,
      'DJ',
      JSON.stringify(['Bollywood', 'Commercial House', 'EDM']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?q=80&w=1000',
        'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      30000.00,
      JSON.stringify({ instagram: 'https://instagram.com/djblaze', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
    ],
    [
      'comp_anchor_vikram',
      'Vikram Anand',
      null,
      'Hyderabad',
      'Vikram Anand is a bilingual anchor and emcee with 200+ events hosted, including grand weddings, product launches, award shows, and corporate galas in Telugu and English.',
      'https://vikramanand.com',
      'vikram@gooevents.com',
      '9123456789',
      'vikram@upi',
      true,
      'Anchor',
      JSON.stringify(['Telugu', 'English', 'Hindi', 'Bilingual MC']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1000',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=Way9Dexny3w',
      20000.00,
      JSON.stringify({ instagram: 'https://instagram.com/vikramanand', youtube: 'https://youtube.com', spotify: '' })
    ],
    [
      'comp_rnb_strings',
      'RnB Strings',
      null,
      'Mumbai',
      'RnB Strings is a live band specializing in feel-good R&B, Soul, and Jazz performances. Ideal for intimate rooftop gigs, supper clubs, and jazz lounges.',
      'https://rnbstrings.music',
      'rnb@gooevents.com',
      '9234567890',
      'rnb@upi',
      true,
      'Band',
      JSON.stringify(['R&B', 'Soul', 'Jazz', 'Neo-Soul']),
      JSON.stringify([
        'https://images.unsplash.com/photo-1535712376018-a1af15164a81?q=80&w=1000',
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1000'
      ]),
      'https://www.youtube.com/watch?v=Way9Dexny3w',
      45000.00,
      JSON.stringify({ instagram: 'https://instagram.com/rnbstrings', youtube: 'https://youtube.com', spotify: 'https://spotify.com' })
    ]
  ];

  for (const c of demoCompanies) {
    const [exists] = await connection.query("SELECT id FROM companies WHERE id = ?", [c[0]]);
    if (exists.length === 0) {
      await connection.query(`
        INSERT INTO companies (id, name, admin_user_id, city, description, website, contact_email, phone, payout_upi, verified, category, genres, gallery_images, video_url, booking_price, social_links)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, c);
    }
  }

  // Seed default events by ID
  console.log("Verifying default events...");
  const demoEvents = [
    [
      'ev_cyber_rave_mumbai',
      'vhop_official',
      'Cyberpunk Rooftop Rave',
      'A neon-drenched night of futuristic beats and high-octane vibes.',
      'Get ready for the most immersive cyberpunk rave Mumbai has ever witnessed. We are taking over the highest rooftop for a night of underground techno, custom-built laser displays, and high-energy synthesizers. Experience an elite lineup of domestic and international techno artists, cyber-themed cocktails, and absolute pure energy.',
      'The Neon Nest Loft',
      'Mumbai',
      'Music',
      999.00,
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000',
      '2026-06-25T21:00:00.000Z',
      'published',
      0,
      JSON.stringify([
        { id: 't-vip', name: 'VIP Access (Backstage + Drink)', price: 1999, benefits: ['Exclusive loft access', 'Meet and greet', 'Complimentary drink ticket'] },
        { id: 't-ga', name: 'General Admission', price: 999, benefits: ['Standard entry', 'High-energy main dancefloor'] }
      ])
    ],
    [
      'ev_comedy_standup_vizag',
      'comp_test_3',
      'Standup Comedy Showdown',
      'Pure observational wit and hilarious punchlines from India\'s top comedians.',
      'A laughing riot incoming to Visakhapatnam! Bring your friends and family for an evening filled with absolute humor, hilarious storytelling, and pure comedy genius. Features a brilliant panel of 4 comics performing fresh, never-heard-before material.',
      'The Laugh Club Cafe',
      'Visakhapatnam',
      'comedy',
      499.00,
      'https://images.unsplash.com/photo-1585699324551-f6c309eedee5?q=80&w=1000',
      '2026-06-28T19:00:00.000Z',
      'published',
      0,
      JSON.stringify([
        { id: 't-front-row', name: 'Front Row Premium', price: 799, benefits: ['Guaranteed front row seating', 'Free mocktail/soft drink'] },
        { id: 't-reg', name: 'Standard Seat', price: 499, benefits: ['Standard general seating'] }
      ])
    ],
    [
      'ev_wellness_camp_vizag',
      'comp_test_2',
      'Sunset Yoga & Sound Healing',
      'Align your mind, body, and spirit by the beach during a stunning golden hour.',
      'Rejuvenate your soul with a meditation masterclass at the beach during sunset. This wellness workshop combines Vinyasa yoga flows with live ambient acoustic handpan and sound bowls therapy, ending with organic health drinks and community bonding.',
      'Bayview Sands Resort',
      'Visakhapatnam',
      'wellness',
      799.00,
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000',
      '2026-06-30T17:00:00.000Z',
      'published',
      0,
      JSON.stringify([
        { id: 't-yoga-pass', name: 'Full Workshop Pass', price: 799, benefits: ['Premium yoga mat usage', 'Sound bath session', 'Organic energy drinks'] }
      ])
    ],
    [
      'ev_jazz_fest_bangalore',
      'comp_rnb_strings',
      'Saturday Jazz Sessions',
      'An evening of soul-stirring jazz and neo-soul by Bangalore\'s finest live band.',
      'Join RnB Strings for an intimate rooftop jazz session at The Loft Space Bangalore. Featuring original compositions, jazz standards, and neo-soul covers alongside premium craft cocktails and small bites.',
      'The Skyline Rooftop Lounge',
      'Bangalore',
      'Music',
      699.00,
      'https://images.unsplash.com/photo-1535712376018-a1af15164a81?q=80&w=1000',
      '2026-07-05T19:30:00.000Z',
      'published',
      22,
      JSON.stringify([
        { id: 't-jazz-vip', name: 'VIP Table (4 Seats)', price: 2499, benefits: ['Reserved table', 'Welcome drinks', 'Live session recording'] },
        { id: 't-jazz-gen', name: 'General Pass', price: 699, benefits: ['Open seating', 'Full live show access'] }
      ])
    ],
    [
      'ev_open_mic_hyderabad',
      'comp_anchor_vikram',
      'Goo Open Mic Night – Hyderabad',
      'Hyderabad\'s most celebrated open mic stage. Poets, musicians, comedians welcome!',
      'A monthly gathering of raw talent at Studio 27 Hyderabad. This edition features 15 performers – musicians, spoken word artists, and standups – competing for the Crowd Favourite prize of ₹5,000.',
      'Studio 27 Hyderabad',
      'Hyderabad',
      'Open Mic',
      149.00,
      'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000',
      '2026-07-08T18:00:00.000Z',
      'published',
      60,
      JSON.stringify([
        { id: 't-perf-pass', name: 'Performer Pass', price: 0, benefits: ['Stage slot 5-7 min', 'Listed on talent roster', 'Audience voting'] },
        { id: 't-audience', name: 'Audience Ticket', price: 149, benefits: ['Full show access', 'Voting rights'] }
      ])
    ],
    [
      'ev_dance_showcase_blr',
      'comp_priya_dance',
      'The Dance Confluence 2026',
      'A dazzling showcase of classical and contemporary dance by award-winning choreographers.',
      'Priya Dance Academy presents a breathtaking two-hour dance showcase featuring Bharatanatyam, Kathak, and Contemporary fusion choreography. This cultural extravaganza is a must-attend for performing arts lovers across Bangalore.',
      'Karnataka Rajyotsava Cultural Hall',
      'Bangalore',
      'Dance',
      499.00,
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1000',
      '2026-07-12T17:00:00.000Z',
      'published',
      0,
      JSON.stringify([
        { id: 't-dance-front', name: 'Premium Front Seat', price: 999, benefits: ['Front row reserved seating', 'Post-show meet and greet'] },
        { id: 't-dance-std', name: 'Standard Seat', price: 499, benefits: ['General hall seating'] }
      ])
    ],
    [
      'ev_band_night_mumbai',
      'comp_local_train',
      'The Local Train – Live in Mumbai',
      'The iconic indie band returns home for a massive 2-hour headlining concert.',
      'The Local Train is back in Mumbai! Experience their biggest setlist featuring fan favourites from Aaoge Tum Kabhi and When I\'m With You. Powered by a world-class sound system and dazzling light design at The Neon Nest Loft.',
      'The Neon Nest Loft',
      'Mumbai',
      'Music',
      1299.00,
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1000',
      '2026-07-19T20:00:00.000Z',
      'published',
      120,
      JSON.stringify([
        { id: 't-band-pit', name: 'Pit Access (Standing)', price: 1299, benefits: ['Closest to stage', 'Standing area'] },
        { id: 't-band-balcony', name: 'Balcony Seating', price: 1799, benefits: ['Reserved balcony seat', 'Elevated view'] }
      ])
    ],
    [
      'ev_classical_night_hyd',
      'comp_sitar_maestro',
      'Sitar under the Stars',
      'An enchanting evening of Hindustani classical music by maestro Ravi Shankar Jr.',
      'Experience the ancient art of the sitar under a canopy of stars at the serene Taramati Baradari Heritage Amphitheatre. Ravi Shankar Jr. performs ragas Yaman, Bhairavi, and an exclusive fusion composition exclusively for Goo Events audiences.',
      'Taramati Baradari Amphitheatre',
      'Hyderabad',
      'Concert',
      599.00,
      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=1000',
      '2026-07-22T19:00:00.000Z',
      'published',
      0,
      JSON.stringify([
        { id: 't-sitar-vip', name: 'VIP Cushion Row', price: 1199, benefits: ['Cushioned front seating', 'Complimentary chai'] },
        { id: 't-sitar-gen', name: 'General Audience', price: 599, benefits: ['Open lawn seating'] }
      ])
    ]
  ];

  for (const e of demoEvents) {
    const [exists] = await connection.query("SELECT id FROM events WHERE id = ?", [e[0]]);
    if (exists.length === 0) {
      await connection.query(`
        INSERT INTO events (id, company_id, title, short_description, description, venue_name, city, category, price, cover_image, start_date, status, tickets_sold, ticket_types)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, e);
    }
  }

  // Seed legacy shows
  const [showsCount] = await connection.query("SELECT _id FROM shows WHERE _id = ?", ["1"]);
  if (showsCount.length === 0) {
    console.log("Seeding legacy shows...");
    await connection.query(`
      INSERT INTO shows (_id, title, description, poster, backdrop, category, genre, rating, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "1",
      "Zakir Khan: Tathastu",
      "Experience the magic of Zakir Khan's storytelling and comedy.",
      "https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000",
      "https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000",
      "Standup",
      JSON.stringify(["Comedy"]),
      9.8,
      999.00
    ]);
  }

  // Seed default venues
  console.log("Verifying default venues...");
  const demoVenues = [
    [
      'v_blue_coffee',
      'The Blue Coffee',
      'Mumbai',
      120,
      10000.00,
      'Charming coffee shop with a cozy acoustic stage.',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1000'
    ],
    [
      'v_loft_space',
      'The Loft Space',
      'Mumbai',
      300,
      15000.00,
      'Industrial design loft space with great acoustics and stage lights.',
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000'
    ],
    [
      'v_studio_27',
      'Studio 27',
      'Visakhapatnam',
      60,
      6000.00,
      'Intimate studio for standup comedy and workshops.',
      'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000'
    ]
  ];

  for (const v of demoVenues) {
    const [exists] = await connection.query("SELECT id FROM venues WHERE id = ?", [v[0]]);
    if (exists.length === 0) {
      await connection.query(`
        INSERT INTO venues (id, name, city, capacity, price, description, cover_image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, v);
    }
  }
}

// Database Initialization (Auto-Table Creation)
async function initDB() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Connected to MySQL server. Verifying tables...");

    // Create profiles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(128) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(512) NULL,
        role VARCHAR(50) DEFAULT 'user',
        city VARCHAR(100) NULL,
        phone VARCHAR(50) NULL,
        onboarded BOOLEAN DEFAULT FALSE,
        interests TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create companies table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        admin_user_id VARCHAR(128) NULL,
        city VARCHAR(100) NULL,
        description TEXT NULL,
        website VARCHAR(255) NULL,
        contact_email VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        payout_upi VARCHAR(255) NULL,
        verified BOOLEAN DEFAULT FALSE,
        category VARCHAR(100) NULL,
        genres TEXT NULL,
        gallery_images TEXT NULL,
        video_url VARCHAR(512) NULL,
        booking_price DECIMAL(10,2) DEFAULT 0.00,
        social_links TEXT NULL
      )
    `);

    // Create events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(128) PRIMARY KEY,
        company_id VARCHAR(128) NOT NULL,
        title VARCHAR(255) NOT NULL,
        short_description TEXT NULL,
        description TEXT NULL,
        venue_name VARCHAR(255) NULL,
        city VARCHAR(100) NULL,
        category VARCHAR(100) NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        cover_image VARCHAR(512) NULL,
        start_date VARCHAR(100) NULL,
        status VARCHAR(50) DEFAULT 'published',
        tickets_sold INT DEFAULT 0,
        ticket_types TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(128) PRIMARY KEY,
        event_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        quantity INT DEFAULT 1,
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        ticket_name VARCHAR(255) NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        payment_id VARCHAR(255) NULL,
        payment_status VARCHAR(50) DEFAULT 'paid',
        booking_status VARCHAR(50) DEFAULT 'confirmed',
        booking_id VARCHAR(100) NULL,
        qr_code VARCHAR(255) NULL,
        guests TEXT NULL,
        booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create artist_bookings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS artist_bookings (
        id VARCHAR(128) PRIMARY KEY,
        artist_id VARCHAR(128) NOT NULL,
        artist_name VARCHAR(255) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        event_date VARCHAR(100) NULL,
        event_type VARCHAR(255) NULL,
        duration_hours DECIMAL(5,2) DEFAULT 0.00,
        message TEXT NULL,
        budget DECIMAL(10,2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'confirmed',
        booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create shows table for legacy support
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shows (
        _id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        poster VARCHAR(512) NULL,
        backdrop VARCHAR(512) NULL,
        category VARCHAR(100) NULL,
        genre TEXT NULL,
        rating DECIMAL(3,1) DEFAULT 0.0,
        price DECIMAL(10,2) DEFAULT 0.00
      )
    `);

    // Create venues table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS venues (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100) NULL,
        capacity INT DEFAULT 100,
        price DECIMAL(10,2) DEFAULT 0.00,
        description TEXT NULL,
        cover_image VARCHAR(512) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Database tables verified/created successfully. Checking custom admin/superadmin schema updates...");

    // Helper to alter columns safely
    async function addColumnSafe(conn, table, col, def) {
      try {
        await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
        console.log(`Column ${col} added to table ${table}.`);
      } catch (err) {
        if (err.errno === 1060 || err.code === 'ER_DUP_FIELDNAME') {
          // Column already exists, ignore
        } else {
          console.error(`Error adding column ${col} to table ${table}:`, err.message);
        }
      }
    }

    await addColumnSafe(connection, 'profiles', 'password', 'VARCHAR(255) NULL');
    await addColumnSafe(connection, 'profiles', 'email_verified', 'BOOLEAN DEFAULT FALSE');
    await addColumnSafe(connection, 'companies', 'manager_name', 'VARCHAR(255) NULL');
    await addColumnSafe(connection, 'companies', 'manager_phone', 'VARCHAR(255) NULL');
    await addColumnSafe(connection, 'companies', 'manager_email', 'VARCHAR(255) NULL');
    await addColumnSafe(connection, 'companies', 'pending_changes', 'TEXT NULL');
    await addColumnSafe(connection, 'companies', 'available_dates', 'TEXT NULL');

    // Create email_verifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      )
    `);
    
    // Seed initial database tables if empty
    await seedMySQLData(connection);

  } catch (err) {
    console.error("Database initialization failed: Check if database exists, host details are correct, or local MySQL is running.", err.message);
  } finally {
    if (connection) connection.release();
  }
}

// Initialize database
initDB();

// --- AD-HOC OTP AND ADMIN MANAGEMENT ENDPOINTS ---

// 1. Send OTP Verification Email
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

  try {
    // Save to email_verifications table
    await pool.query(`
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES (?, ?, ?)
      ON DUPLICKEY UPDATE code = ?, expires_at = ?
    `, [email, code, expiresAtStr, code, expiresAtStr]);

    // Send email using Nodemailer
    const mailOptions = {
      from: '"Goo Events" <contact@gooevents.in>',
      to: email,
      subject: 'Goo Events - Email Verification OTP',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e1e1e8; border-radius: 12px; padding: 24px; background-color: #ffffff;">
          <h2 style="color: #ea580c; text-align: center; margin-bottom: 24px;">Goo Events Verification Code</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Hello,</p>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">To verify your email address, please use the following 6-digit one-time password (OTP):</p>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827;">\${code}</span>
          </div>
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP \${code} sent successfully to \${email}`);
    res.json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP email. Please check SMTP parameters.' });
  }
});

// 2. Verify OTP Code
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and Code are required' });

  try {
    const [rows] = await pool.query("SELECT * FROM email_verifications WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'No OTP requested for this email' });

    const verification = rows[0];
    const now = new Date();
    const expiry = new Date(verification.expires_at);

    if (expiry < now) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (verification.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // OTP is valid! Delete record
    await pool.query("DELETE FROM email_verifications WHERE email = ?", [email]);

    // Update profiles email_verified
    await pool.query("UPDATE profiles SET email_verified = true WHERE email = ?", [email]);

    res.json({ message: 'Email verified successfully!' });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// 3. Login Admin / Super Admin (with database verification)
app.post('/api/auth/login-admin', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password and role are required' });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM profiles WHERE email = ? AND role = ?", [email, role]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or role' });
    }

    const userProfile = rows[0];
    // Check password
    if (userProfile.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return profile
    res.json({
      id: userProfile.id,
      full_name: userProfile.full_name,
      username: userProfile.username,
      email: userProfile.email,
      avatar_url: userProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=\\${userProfile.id}`,
      role: userProfile.role,
      city: userProfile.city,
      phone: userProfile.phone,
      email_verified: !!userProfile.email_verified,
      onboarded: !!userProfile.onboarded
    });

  } catch (error) {
    console.error('Admin login database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Super Admin: Create Artist Account
app.post('/api/superadmin/create-artist', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    // Check if email already registered
    const [existing] = await pool.query("SELECT id FROM profiles WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const userId = `admin_\${Math.random().toString(36).substring(2, 11)}`;
    const username = email.split('@')[0];

    // Insert profile
    await pool.query(`
      INSERT INTO profiles (id, full_name, username, email, role, onboarded, password, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, name, username, email, 'admin', false, password, false]);

    // Insert company (Artist Portfolio)
    const companyId = `comp_\${Math.random().toString(36).substring(2, 11)}`;
    await pool.query(`
      INSERT INTO companies (id, name, admin_user_id, contact_email, verified, category, genres, gallery_images, social_links)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId,
      name,
      userId,
      email,
      false,
      'DJ',
      JSON.stringify(['Electronic']),
      JSON.stringify(['https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000']),
      JSON.stringify({ instagram: '', youtube: '', spotify: '' })
    ]);

    console.log(`Artist account \${email} created successfully by Super Admin.`);
    res.status(201).json({ message: 'Artist account created successfully!' });

  } catch (error) {
    console.error('Create artist account error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Super Admin: Get Pending Approvals (both unverified new artists & verified artists with updates)
app.get('/api/superadmin/pending-approvals', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM companies 
      WHERE verified = false OR pending_changes IS NOT NULL
    `);

    const parsedRows = rows.map(c => ({
      ...c,
      genres: c.genres ? JSON.parse(c.genres) : [],
      gallery_images: c.gallery_images ? JSON.parse(c.gallery_images) : [],
      social_links: c.social_links ? JSON.parse(c.social_links) : {},
      pending_changes: c.pending_changes ? JSON.parse(c.pending_changes) : null,
      verified: !!c.verified
    }));

    res.json(parsedRows);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 6. Super Admin: Approve Changes (New verification or edits)
app.post('/api/superadmin/approve-changes/:id', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Artist portfolio not found' });

    const company = rows[0];

    if (company.pending_changes) {
      // Merge pending changes into main portfolio
      const changes = JSON.parse(company.pending_changes);
      
      await pool.query(`
        UPDATE companies SET
          name = ?, phone = ?, website = ?, description = ?, payout_upi = ?, contact_email = ?,
          category = ?, genres = ?, gallery_images = ?, video_url = ?, booking_price = ?, social_links = ?,
          manager_name = ?, manager_phone = ?, manager_email = ?, pending_changes = NULL, verified = true
        WHERE id = ?
      `, [
        changes.name !== undefined ? changes.name : company.name,
        changes.phone !== undefined ? changes.phone : company.phone,
        changes.website !== undefined ? changes.website : company.website,
        changes.description !== undefined ? changes.description : company.description,
        changes.payout_upi !== undefined ? changes.payout_upi : company.payout_upi,
        changes.contact_email !== undefined ? changes.contact_email : company.contact_email,
        changes.category !== undefined ? changes.category : company.category,
        changes.genres !== undefined ? JSON.stringify(changes.genres) : company.genres,
        changes.gallery_images !== undefined ? JSON.stringify(changes.gallery_images) : company.gallery_images,
        changes.video_url !== undefined ? changes.video_url : company.video_url,
        changes.booking_price !== undefined ? parseFloat(changes.booking_price) : company.booking_price,
        changes.social_links !== undefined ? JSON.stringify(changes.social_links) : company.social_links,
        changes.manager_name !== undefined ? changes.manager_name : company.manager_name,
        changes.manager_phone !== undefined ? changes.manager_phone : company.manager_phone,
        changes.manager_email !== undefined ? changes.manager_email : company.manager_email,
        req.params.id
      ]);
    } else {
      // Initial portfolio verification approval
      await pool.query("UPDATE companies SET verified = true WHERE id = ?", [req.params.id]);
    }

    res.json({ message: 'Changes approved and verified successfully!' });

  } catch (error) {
    console.error('Approve changes error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 7. Super Admin: Reject Changes
app.post('/api/superadmin/reject-changes/:id', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Artist portfolio not found' });

    const company = rows[0];

    if (company.pending_changes) {
      // Rejecting pending edits: keep original live info but clear pending changes
      await pool.query("UPDATE companies SET pending_changes = NULL WHERE id = ?", [req.params.id]);
    } else {
      // Rejecting initial verification: do nothing or keep unverified
      await pool.query("UPDATE companies SET verified = false WHERE id = ?", [req.params.id]);
    }

    res.json({ message: 'Changes rejected and cleared' });

  } catch (error) {
    console.error('Reject changes error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 8. Available Dates Calendar GET & PUT
app.get('/api/companies/:id/calendar', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT available_dates, id FROM companies WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Artist portfolio not found' });

    const company = rows[0];
    const availableDates = company.available_dates ? JSON.parse(company.available_dates) : [];

    // Also get scheduled events
    const [eventRows] = await pool.query("SELECT id, title, start_date, venue_name, city FROM events WHERE company_id = ? AND status = 'published'", [company.id]);

    res.json({
      available_dates: availableDates,
      events: eventRows
    });

  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/companies/:id/calendar', async (req, res) => {
  const { available_dates } = req.body;
  if (!Array.isArray(available_dates)) {
    return res.status(400).json({ error: 'available_dates must be an array' });
  }

  try {
    await pool.query(`
      UPDATE companies 
      SET available_dates = ? 
      WHERE id = ?
    `, [JSON.stringify(available_dates), req.params.id]);

    res.json({ message: 'Availability calendar updated successfully!' });

  } catch (error) {
    console.error('Update calendar error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Initialize database
initDB();

// --- API ROUTES ---

// 1. Auth Sync
app.post('/api/auth/sync', async (req, res) => {
  const { id, full_name, username, email, avatar_url, role, city, phone } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM profiles WHERE id = ?", [id]);
    let profile;

    if (rows.length === 0) {
      profile = {
        id,
        full_name: full_name || username || 'Anonymous User',
        username: username || `user_${Math.random().toString(36).substring(2, 8)}`,
        email: email || `${id}@ingo.in`,
        avatar_url: avatar_url || null,
        role: role || 'user',
        city: city || 'Mumbai',
        phone: phone || '',
        onboarded: false,
        interests: JSON.stringify([])
      };
      await pool.query(`
        INSERT INTO profiles (id, full_name, username, email, avatar_url, role, city, phone, onboarded, interests)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [profile.id, profile.full_name, profile.username, profile.email, profile.avatar_url, profile.role, profile.city, profile.phone, profile.onboarded, profile.interests]);
    } else {
      profile = rows[0];
      profile.full_name = full_name || profile.full_name;
      profile.avatar_url = avatar_url || profile.avatar_url;
      profile.city = city || profile.city;
      await pool.query(`
        UPDATE profiles SET full_name = ?, avatar_url = ?, city = ? WHERE id = ?
      `, [profile.full_name, profile.avatar_url, profile.city, id]);
    }

    // Ensure an associated company exists for admins
    if (role === 'admin' || profile.role === 'admin') {
      const [compRows] = await pool.query("SELECT * FROM companies WHERE admin_user_id = ?", [id]);
      if (compRows.length === 0) {
        const compId = `comp_${Math.random().toString(36).substring(2, 11)}`;
        await pool.query(`
          INSERT INTO companies (id, name, admin_user_id, city, description, website, contact_email, phone, payout_upi, verified, category, genres, gallery_images, video_url, booking_price, social_links)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          compId,
          profile.full_name,
          id,
          profile.city || 'Mumbai',
          'Newly registered artist. Setup your biography under Portfolio Settings.',
          '',
          profile.email,
          '',
          '',
          false,
          'DJ',
          JSON.stringify(['Electronic']),
          JSON.stringify(['https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000']),
          'https://www.youtube.com/watch?v=zSWdZVtXT7E',
          15000.00,
          JSON.stringify({ instagram: '', youtube: '', spotify: '' })
        ]);
      }
    }

    res.json({ message: 'Profile synced', onboarded: !!profile.onboarded });
  } catch (err) {
    console.error("Auth sync error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Onboard Save
app.post('/api/auth/onboard', async (req, res) => {
  const { userId, interests } = req.body;
  try {
    const [result] = await pool.query(`
      UPDATE profiles SET onboarded = true, interests = ? WHERE id = ?
    `, [JSON.stringify(interests || []), userId]);

    if (result.affectedRows > 0) {
      res.json({ message: 'Onboarding completed successfully' });
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (err) {
    console.error("Onboarding error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Get Events
app.get('/api/events', async (req, res) => {
  const { city } = req.query;
  try {
    let query = "SELECT * FROM events WHERE status = 'published'";
    let params = [];
    if (city && city !== 'All') {
      query += " AND LOWER(city) = LOWER(?)";
      params.push(city);
    }
    const [rows] = await pool.query(query, params);
    
    const parsedRows = rows.map(r => ({
      ...r,
      ticket_types: r.ticket_types ? JSON.parse(r.ticket_types) : []
    }));
    res.json(parsedRows);
  } catch (err) {
    console.error("Get events error, falling back to mock data:", err);
    let filtered = MOCK_EVENTS;
    if (city && city !== 'All') {
      filtered = filtered.filter(e => e.city.toLowerCase() === city.toLowerCase());
    }
    const parsed = filtered.map(r => ({
      ...r,
      ticket_types: r.ticket_types ? JSON.parse(r.ticket_types) : []
    }));
    res.json(parsed);
  }
});

// 4. Get Event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM events WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = rows[0];
    event.ticket_types = event.ticket_types ? JSON.parse(event.ticket_types) : [];
    res.json(event);
  } catch (err) {
    console.error("Get event error, falling back to mock data:", err);
    const event = MOCK_EVENTS.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const parsedEvent = {
      ...event,
      ticket_types: event.ticket_types ? JSON.parse(event.ticket_types) : []
    };
    res.json(parsedEvent);
  }
});

// 5. Create/Update Event (Admin)
app.post('/api/events', async (req, res) => {
  const event = req.body;
  const id = event.id || `ev_${Math.random().toString(36).substring(2, 11)}`;
  try {
    const [existing] = await pool.query("SELECT id FROM events WHERE id = ?", [id]);
    if (existing.length > 0) {
      // Update event
      await pool.query(`
        UPDATE events SET
          company_id = ?, title = ?, short_description = ?, description = ?, venue_name = ?, city = ?, 
          category = ?, price = ?, cover_image = ?, start_date = ?, status = ?, ticket_types = ?
        WHERE id = ?
      `, [
        event.company_id || 'vhop_official',
        event.title,
        event.short_description || '',
        event.description || '',
        event.venue_name || 'TBA',
        event.city || 'Mumbai',
        event.category || 'music',
        parseFloat(event.price) || 0.00,
        event.cover_image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000',
        event.start_date || new Date().toISOString(),
        event.status || 'published',
        JSON.stringify(event.ticket_types || []),
        id
      ]);
      res.json({ id, message: 'Event updated successfully' });
    } else {
      // Create new event
      await pool.query(`
        INSERT INTO events (id, company_id, title, short_description, description, venue_name, city, category, price, cover_image, start_date, status, tickets_sold, ticket_types)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        event.company_id || 'vhop_official',
        event.title,
        event.short_description || '',
        event.description || '',
        event.venue_name || 'TBA',
        event.city || 'Mumbai',
        event.category || 'music',
        parseFloat(event.price) || 0.00,
        event.cover_image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000',
        event.start_date || new Date().toISOString(),
        'published',
        0,
        JSON.stringify(event.ticket_types || [])
      ]);
      res.status(201).json({ id, message: 'Event created successfully' });
    }
  } catch (err) {
    console.error("Create/update event error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 6. Delete Event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM events WHERE id = ?", [req.params.id]);
    if (result.affectedRows > 0) {
      res.json({ message: 'Event deleted' });
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 7. Bookings Create
app.post('/api/bookings', async (req, res) => {
  const booking = req.body;
  const id = `bk_${Math.random().toString(36).substring(2, 11)}`;
  const booking_id = booking.booking_id || `ING-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const qr_code = booking.qr_code || `INGO-QR-${Date.now()}`;
  const quantity = booking.quantity || 1;

  try {
    await pool.query(`
      INSERT INTO bookings (id, event_id, user_id, quantity, total_amount, ticket_name, price, payment_id, payment_status, booking_status, booking_id, qr_code, guests)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      booking.event_id,
      booking.user_id,
      quantity,
      booking.total_amount || 0.0,
      booking.ticket_name || 'Standard Admission',
      booking.price || 0.0,
      booking.payment_id || `pay_${Math.random().toString(36).substring(2, 12)}`,
      'paid',
      'confirmed',
      booking_id,
      qr_code,
      JSON.stringify(booking.guests || [])
    ]);

    // Update tickets sold on the event
    await pool.query(`
      UPDATE events SET tickets_sold = tickets_sold + ? WHERE id = ?
    `, [quantity, booking.event_id]);

    console.log(`Mock Email sent: Ticket purchased successfully by ${booking.user_id} for event ${booking.event_id}!`);
    res.status(201).json({ id, message: 'Booking confirmed' });
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 8. Get Bookings by User ID
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, e.title AS event_title, e.cover_image, e.venue_name, e.city, e.start_date
      FROM bookings b
      LEFT JOIN events e ON b.event_id = e.id
      WHERE b.user_id = ?
    `, [req.params.userId]);

    const parsedRows = rows.map(r => ({
      ...r,
      guests: r.guests ? JSON.parse(r.guests) : []
    }));
    res.json(parsedRows);
  } catch (err) {
    console.error("Get user bookings error, falling back to mock data:", err);
    const mockBookings = [
      {
        id: 'bk_mock_1',
        event_id: 'ev_cyber_rave_mumbai',
        user_id: req.params.userId,
        ticket_name: 'VIP Access (Backstage + Drink)',
        price: 1999.00,
        quantity: 2,
        booking_id: 'ING-CYBER-VIP',
        guests: [],
        status: 'confirmed',
        booked_at: new Date().toISOString(),
        event_title: 'Cyberpunk Rooftop Rave',
        cover_image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000',
        venue_name: 'The Neon Nest Loft',
        city: 'Mumbai',
        start_date: '2026-06-25T21:00:00.000Z'
      }
    ];
    res.json(mockBookings);
  }
});

// 9. Admin Dashboard Data
app.get('/api/admin/dashboard/:userId', async (req, res) => {
  try {
    const [companyRows] = await pool.query("SELECT * FROM companies WHERE admin_user_id = ?", [req.params.userId]);
    let company;
    if (companyRows.length === 0) {
      // Auto-create a company profile
      const [profileRows] = await pool.query("SELECT * FROM profiles WHERE id = ?", [req.params.userId]);
      const profile = profileRows[0];
      const compId = `comp_${Math.random().toString(36).substring(2, 11)}`;
      
      company = {
        id: compId,
        name: profile ? profile.full_name : 'Goo Artist',
        admin_user_id: req.params.userId,
        city: profile ? profile.city : 'Mumbai',
        description: 'Newly registered artist. Setup your biography under Portfolio Settings.',
        website: '',
        contact_email: profile ? profile.email : 'artist@gooevents.com',
        phone: '',
        payout_upi: '',
        verified: false,
        category: 'DJ',
        genres: JSON.stringify(['Electronic']),
        gallery_images: JSON.stringify(['https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000']),
        video_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
        booking_price: 15000.00,
        social_links: JSON.stringify({ instagram: '', youtube: '', spotify: '' })
      };

      await pool.query(`
        INSERT INTO companies (id, name, admin_user_id, city, description, website, contact_email, phone, payout_upi, verified, category, genres, gallery_images, video_url, booking_price, social_links)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        company.id, company.name, company.admin_user_id, company.city, company.description, company.website,
        company.contact_email, company.phone, company.payout_upi, company.verified, company.category,
        company.genres, company.gallery_images, company.video_url, company.booking_price, company.social_links
      ]);

      company.genres = JSON.parse(company.genres);
      company.gallery_images = JSON.parse(company.gallery_images);
      company.social_links = JSON.parse(company.social_links);
    } else {
      company = companyRows[0];
      company.genres = company.genres ? JSON.parse(company.genres) : [];
      company.gallery_images = company.gallery_images ? JSON.parse(company.gallery_images) : [];
      company.social_links = company.social_links ? JSON.parse(company.social_links) : {};
      company.verified = !!company.verified;
    }

    const [eventRows] = await pool.query("SELECT * FROM events WHERE company_id = ?", [company.id]);
    const parsedEvents = eventRows.map(e => ({
      ...e,
      ticket_types: e.ticket_types ? JSON.parse(e.ticket_types) : []
    }));

    res.json({ company, events: parsedEvents });
  } catch (err) {
    console.error("Admin dashboard data error, falling back to mock data:", err);
    let company = MOCK_COMPANIES.find(c => c.admin_user_id === req.params.userId || c.id === 'comp_test_1');
    company = {
      ...company,
      genres: company.genres ? JSON.parse(company.genres) : [],
      gallery_images: company.gallery_images ? JSON.parse(company.gallery_images) : [],
      social_links: company.social_links ? JSON.parse(company.social_links) : {}
    };
    const parsedEvents = MOCK_EVENTS.filter(e => e.company_id === company.id).map(e => ({
      ...e,
      ticket_types: e.ticket_types ? JSON.parse(e.ticket_types) : []
    }));
    res.json({ company, events: parsedEvents });
  }
});

// 10. Update Company details
app.put('/api/companies/:id', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const company = rows[0];

    const { 
      name, phone, website, description, payout_upi, contact_email,
      category, genres, gallery_images, video_url, booking_price, social_links,
      manager_name, manager_phone, manager_email
    } = req.body;

    const payload = {
      name: name !== undefined ? name : company.name,
      phone: phone !== undefined ? phone : company.phone,
      website: website !== undefined ? website : company.website,
      description: description !== undefined ? description : company.description,
      payout_upi: payout_upi !== undefined ? payout_upi : company.payout_upi,
      contact_email: contact_email !== undefined ? contact_email : company.contact_email,
      category: category !== undefined ? category : company.category,
      genres: genres !== undefined ? genres : (company.genres ? JSON.parse(company.genres) : []),
      gallery_images: gallery_images !== undefined ? gallery_images : (company.gallery_images ? JSON.parse(company.gallery_images) : []),
      video_url: video_url !== undefined ? video_url : company.video_url,
      booking_price: booking_price !== undefined ? parseFloat(booking_price) : company.booking_price,
      social_links: social_links !== undefined ? social_links : (company.social_links ? JSON.parse(company.social_links) : {}),
      manager_name: manager_name !== undefined ? manager_name : company.manager_name,
      manager_phone: manager_phone !== undefined ? manager_phone : company.manager_phone,
      manager_email: manager_email !== undefined ? manager_email : company.manager_email
    };

    if (company.verified) {
      // If already verified, updates must go to pending_changes for superadmin approval
      await pool.query(`
        UPDATE companies SET pending_changes = ? WHERE id = ?
      `, [JSON.stringify(payload), req.params.id]);
      
      res.json({ message: 'Portfolio changes submitted for Super Admin approval. Your live profile remains active with original details.' });
    } else {
      // If not verified yet (new profile), allow updating directly so they can complete onboarding
      await pool.query(`
        UPDATE companies SET
          name = ?, phone = ?, website = ?, description = ?, payout_upi = ?, contact_email = ?,
          category = ?, genres = ?, gallery_images = ?, video_url = ?, booking_price = ?, social_links = ?,
          manager_name = ?, manager_phone = ?, manager_email = ?
        WHERE id = ?
      `, [
        payload.name, payload.phone, payload.website, payload.description, payload.payout_upi, payload.contact_email,
        payload.category, JSON.stringify(payload.genres), JSON.stringify(payload.gallery_images), payload.video_url,
        payload.booking_price, JSON.stringify(payload.social_links), payload.manager_name, payload.manager_phone,
        payload.manager_email, req.params.id
      ]);

      res.json({ message: 'Company updated successfully' });
    }
  } catch (err) {
    console.error("Update company error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 11. Verify Company
app.post('/api/companies/:id/verify', async (req, res) => {
  try {
    const [result] = await pool.query("UPDATE companies SET verified = true WHERE id = ?", [req.params.id]);
    if (result.affectedRows > 0) {
      res.json({ message: 'Company verified successfully' });
    } else {
      res.status(404).json({ error: 'Company not found' });
    }
  } catch (err) {
    console.error("Verify company error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 12. Global Admin Stats
app.get('/api/admin/global-stats', async (req, res) => {
  try {
    const [eventRows] = await pool.query("SELECT * FROM events");
    const [companyRows] = await pool.query("SELECT * FROM companies");
    const [bookingRows] = await pool.query("SELECT * FROM bookings");
    const [profileRows] = await pool.query("SELECT COUNT(*) as count FROM profiles");

    const parsedEvents = eventRows.map(e => ({
      ...e,
      ticket_types: e.ticket_types ? JSON.parse(e.ticket_types) : []
    }));

    const parsedCompanies = companyRows.map(c => ({
      ...c,
      genres: c.genres ? JSON.parse(c.genres) : [],
      gallery_images: c.gallery_images ? JSON.parse(c.gallery_images) : [],
      social_links: c.social_links ? JSON.parse(c.social_links) : {}
    }));

    const totalRevenue = bookingRows.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
    const totalBookings = bookingRows.reduce((sum, b) => sum + (parseInt(b.quantity) || 1), 0);
    const activeEvents = parsedEvents.filter(e => e.status === 'published').length;
    const totalUsers = profileRows[0]?.count || 0;

    res.json({
      events: parsedEvents,
      companies: parsedCompanies,
      stats: {
        totalRevenue,
        totalBookings,
        activeEvents,
        totalUsers
      }
    });
  } catch (err) {
    console.error("Global admin stats error, falling back to mock data:", err);
    const parsedEvents = MOCK_EVENTS.map(e => ({
      ...e,
      ticket_types: e.ticket_types ? JSON.parse(e.ticket_types) : []
    }));

    const parsedCompanies = MOCK_COMPANIES.map(c => ({
      ...c,
      genres: c.genres ? JSON.parse(c.genres) : [],
      gallery_images: c.gallery_images ? JSON.parse(c.gallery_images) : [],
      social_links: c.social_links ? JSON.parse(c.social_links) : {}
    }));

    res.json({
      events: parsedEvents,
      companies: parsedCompanies,
      stats: {
        totalRevenue: 28989,
        totalBookings: 80,
        activeEvents: parsedEvents.length,
        totalUsers: 86
      }
    });
  }
});

// 13. Activity Logging
app.post('/api/log', (req, res) => {
  const { type, user, details } = req.body;
  console.log(`[INGO Log] ${type} | User: ${JSON.stringify(user)} | Details: ${JSON.stringify(details)}`);
  res.json({ message: 'Logged successfully' });
});

// --- STRIPE PAYMENTS INTENTS ---
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_placeholder');

app.post('/api/payments/create-intent', async (req, res) => {
  const { amount } = req.body;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret || stripeSecret === 'sk_test_mock_stripe_key_placeholder') {
    return res.json({ clientSecret: "pi_mock_secret_" + Date.now(), isMock: true });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'inr',
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe Error:", err.message);
    res.json({ clientSecret: "pi_mock_secret_" + Date.now(), isMock: true });
  }
});

// --- LEGACY MOVIE SHOWS SUPPORT ---
app.get('/api/shows', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM shows");
    const parsedRows = rows.map(s => ({
      ...s,
      genre: s.genre ? JSON.parse(s.genre) : []
    }));
    res.json(parsedRows);
  } catch (err) {
    console.error("Get shows error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/shows/:id', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM shows WHERE _id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Show not found' });
    const show = rows[0];
    show.genre = show.genre ? JSON.parse(show.genre) : [];
    res.json(show);
  } catch (err) {
    console.error("Get show by ID error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/bookings/my-tickets', async (req, res) => {
  const { email } = req.query;
  try {
    const [rows] = await pool.query("SELECT * FROM bookings");
    const matchedBookings = rows.filter(b => {
      try {
        const guestsList = b.guests ? JSON.parse(b.guests) : [];
        return Array.isArray(guestsList) && guestsList.some(g => g.email === email);
      } catch (e) {
        return false;
      }
    });

    const parsedBookings = matchedBookings.map(b => ({
      ...b,
      guests: b.guests ? JSON.parse(b.guests) : []
    }));
    res.json(parsedBookings);
  } catch (err) {
    console.error("Get my tickets error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 14. Get All Verified Artists
app.get('/api/artists', async (req, res) => {
  const { category, city } = req.query;
  try {
    let query = "SELECT * FROM companies WHERE verified = true AND id != 'vhop_official'";
    let params = [];

    if (category && category.toLowerCase() !== 'all') {
      query += " AND LOWER(category) = LOWER(?)";
      params.push(category);
    }
    if (city && city.toLowerCase() !== 'all') {
      query += " AND LOWER(city) = LOWER(?)";
      params.push(city);
    }

    const [rows] = await pool.query(query, params);
    const parsedRows = rows.map(c => ({
      ...c,
      genres: c.genres ? JSON.parse(c.genres) : [],
      gallery_images: c.gallery_images ? JSON.parse(c.gallery_images) : [],
      social_links: c.social_links ? JSON.parse(c.social_links) : {}
    }));

    res.json(parsedRows);
  } catch (err) {
    console.error("Get artists error, falling back to mock data:", err);
    let filtered = MOCK_COMPANIES;
    if (category && category.toLowerCase() !== 'all') {
      filtered = filtered.filter(c => c.category && c.category.toLowerCase() === category.toLowerCase());
    }
    if (city && city.toLowerCase() !== 'all') {
      filtered = filtered.filter(c => c.city && c.city.toLowerCase() === city.toLowerCase());
    }
    const parsed = filtered.map(c => ({
      ...c,
      genres: c.genres ? JSON.parse(c.genres) : [],
      gallery_images: c.gallery_images ? JSON.parse(c.gallery_images) : [],
      social_links: c.social_links ? JSON.parse(c.social_links) : {}
    }));
    res.json(parsed);
  }
});

// 15. Get Artist Details by ID
app.get('/api/artists/:id', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Artist not found' });
    
    const artist = rows[0];
    artist.genres = artist.genres ? JSON.parse(artist.genres) : [];
    artist.gallery_images = artist.gallery_images ? JSON.parse(artist.gallery_images) : [];
    artist.social_links = artist.social_links ? JSON.parse(artist.social_links) : {};

    const [eventRows] = await pool.query("SELECT * FROM events WHERE company_id = ? AND status = 'published'", [artist.id]);
    const parsedEvents = eventRows.map(e => ({
      ...e,
      ticket_types: e.ticket_types ? JSON.parse(e.ticket_types) : []
    }));

    res.json({ artist, events: parsedEvents });
  } catch (err) {
    console.error("Get artist details error, falling back to mock data:", err);
    const artist = MOCK_COMPANIES.find(c => c.id === req.params.id);
    if (!artist) return res.status(404).json({ error: 'Artist profile not found' });
    
    const parsedArtist = {
      ...artist,
      genres: artist.genres ? JSON.parse(artist.genres) : [],
      gallery_images: artist.gallery_images ? JSON.parse(artist.gallery_images) : [],
      social_links: artist.social_links ? JSON.parse(artist.social_links) : {}
    };
    
    const artistEvents = MOCK_EVENTS.filter(e => e.company_id === artist.id && e.status === 'published').map(e => ({
      ...e,
      ticket_types: e.ticket_types ? JSON.parse(e.ticket_types) : []
    }));
    
    res.json({ artist: parsedArtist, events: artistEvents });
  }
});

// 16. Book / Hire Artist Endpoint
app.post('/api/artists/:id/book', async (req, res) => {
  const { user_id, event_date, event_type, duration_hours, message, budget } = req.body;
  const bookingId = `art_bk_${Math.random().toString(36).substring(2, 11)}`;
  const globalBookingId = `bk_${Math.random().toString(36).substring(2, 11)}`;
  const booking_code = `GART-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  try {
    const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Artist not found' });
    const artist = rows[0];

    // Insert into artist_bookings
    await pool.query(`
      INSERT INTO artist_bookings (id, artist_id, artist_name, user_id, event_date, event_type, duration_hours, message, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bookingId,
      artist.id,
      artist.name,
      user_id,
      event_date,
      event_type,
      parseFloat(duration_hours) || 0.00,
      message || '',
      parseFloat(budget) || artist.booking_price || 15000.00
    ]);

    // Also add a global booking record for stats
    const calculatedBudget = parseFloat(budget) || artist.booking_price || 15000.00;
    await pool.query(`
      INSERT INTO bookings (id, event_id, user_id, quantity, total_amount, ticket_name, price, payment_status, booking_status, booking_id, qr_code, guests)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      globalBookingId,
      'artist_booking_event',
      user_id,
      1,
      calculatedBudget,
      `Artist Hire: ${artist.name}`,
      calculatedBudget,
      'paid',
      'confirmed',
      booking_code,
      `INGO-QR-ART-${Date.now()}`,
      JSON.stringify([])
    ]);

    res.status(201).json({ id: bookingId, message: 'Artist booked successfully!' });
  } catch (err) {
    console.error("Book artist error:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 17. Venues API Endpoints
const MOCK_VENUES_GLOBAL = [
  { id: 'v_blue_coffee', name: 'The Blue Coffee', city: 'Mumbai', capacity: 120, price: 10000, description: 'Charming coffee shop with a cozy acoustic stage.', cover_image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1000' },
  { id: 'v_loft_space', name: 'The Loft Space', city: 'Mumbai', capacity: 300, price: 15000, description: 'Industrial design loft space with great acoustics and stage lights.', cover_image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000' },
  { id: 'v_studio_27', name: 'Studio 27', city: 'Visakhapatnam', capacity: 60, price: 6000, description: 'Intimate studio for standup comedy and workshops.', cover_image: 'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?q=80&w=1000' }
];

app.get('/api/venues', async (req, res) => {
  const { city } = req.query;
  try {
    let query = "SELECT * FROM venues";
    let params = [];
    if (city && city !== 'All') {
      query += " WHERE LOWER(city) = LOWER(?)";
      params.push(city);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Get venues error, falling back to mock data:", err);
    let filtered = MOCK_VENUES_GLOBAL;
    if (city && city !== 'All') {
      filtered = filtered.filter(v => v.city.toLowerCase() === city.toLowerCase());
    }
    res.json(filtered);
  }
});

app.post('/api/venues', async (req, res) => {
  const { name, city, capacity, price, description, cover_image } = req.body;
  const id = `v_${Math.random().toString(36).substring(2, 11)}`;
  try {
    await pool.query(`
      INSERT INTO venues (id, name, city, capacity, price, description, cover_image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, name, city || 'Mumbai', parseInt(capacity) || 100, parseFloat(price) || 0.00, description || '', cover_image || '']);
    res.status(201).json({ id, message: 'Venue registered successfully' });
  } catch (err) {
    console.error("Create venue error:", err);
    MOCK_VENUES_GLOBAL.push({
      id,
      name,
      city: city || 'Mumbai',
      capacity: parseInt(capacity) || 100,
      price: parseFloat(price) || 0.00,
      description: description || '',
      cover_image: cover_image || ''
    });
    res.status(201).json({ id, message: 'Venue registered locally (fallback mode)' });
  }
});

app.post('/api/venues/:id/request', async (req, res) => {
  const { event_title, preferred_date, organizer_id } = req.body;
  console.log(`[INGO Venue request] Event "${event_title}" requests venue "${req.params.id}" on date "${preferred_date}" by Organizer: ${organizer_id}`);
  res.json({ message: 'Venue booking request sent. Venue partner will contact you shortly.' });
});

// 18. Register Artist Portfolio (Join as Artist)
app.post('/api/artists/register', async (req, res) => {
  const { userId, name, category, genres, booking_price, description, video_url, contact_email, phone, social_links, gallery_images } = req.body;
  const companyId = `comp_${Math.random().toString(36).substring(2, 11)}`;
  try {
    const [existing] = await pool.query("SELECT * FROM companies WHERE admin_user_id = ?", [userId]);
    if (existing.length > 0) {
      await pool.query(`
        UPDATE companies SET
          name = ?, category = ?, genres = ?, booking_price = ?, description = ?, video_url = ?, contact_email = ?, phone = ?, social_links = ?, gallery_images = ?, verified = false
        WHERE admin_user_id = ?
      `, [name, category, JSON.stringify(genres || []), parseFloat(booking_price) || 0.00, description || '', video_url || '', contact_email || '', phone || '', JSON.stringify(social_links || {}), JSON.stringify(gallery_images || []), userId]);
      
      await pool.query("UPDATE profiles SET role = 'admin' WHERE id = ?", [userId]);
      return res.json({ id: existing[0].id, message: 'Artist portfolio updated and submitted for review!' });
    }

    await pool.query(`
      INSERT INTO companies (id, name, admin_user_id, city, description, website, contact_email, phone, payout_upi, verified, category, genres, gallery_images, video_url, booking_price, social_links)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, name, userId, 'Mumbai', description || '', '', contact_email || '', phone || '', '', false, category,
      JSON.stringify(genres || []), JSON.stringify(gallery_images || []), video_url || '', parseFloat(booking_price) || 0.00,
      JSON.stringify(social_links || {})
    ]);

    await pool.query("UPDATE profiles SET role = 'admin' WHERE id = ?", [userId]);
    res.status(201).json({ id: companyId, message: 'Artist portfolio registered and submitted for review!' });
  } catch (err) {
    console.error("Register artist error:", err);
    MOCK_COMPANIES.push({
      id: companyId, name, admin_user_id: userId, city: 'Mumbai', description: description || '', website: '',
      contact_email: contact_email || '', phone: phone || '', payout_upi: '', verified: 0, category,
      genres: JSON.stringify(genres || []), gallery_images: JSON.stringify(gallery_images || []), video_url: video_url || '',
      booking_price: parseFloat(booking_price) || 0.00, social_links: JSON.stringify(social_links || {})
    });
    res.status(201).json({ id: companyId, message: 'Artist registered locally (fallback mode)' });
  }
});

// --- OBSERVABILITY HUB DASHBOARD ENDPOINTS ---

// JSON stats endpoint
app.get('/api/observability/stats', async (req, res) => {
  let dbStatus = 'Disconnected';
  let dbLatency = null;
  let dbTables = [];
  
  let conn;
  try {
    conn = await pool.getConnection();
    const queryStart = Date.now();
    await conn.query("SELECT 1");
    dbLatency = Date.now() - queryStart;
    dbStatus = 'Connected';
    
    const tablesList = ['profiles', 'companies', 'events', 'bookings', 'artist_bookings', 'shows'];
    for (const table of tablesList) {
      try {
        const [rows] = await conn.query(`SELECT COUNT(*) as count FROM \`${table}\``);
        dbTables.push({ table, count: rows[0].count });
      } catch (tableErr) {
        dbTables.push({ table, count: 'Not Created' });
      }
    }
  } catch (err) {
    dbStatus = 'Error: ' + err.message;
  } finally {
    if (conn) conn.release();
  }

  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    server: {
      uptime: Math.round(uptime),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
      nodeVersion: process.version,
      platform: process.platform
    },
    database: {
      status: dbStatus,
      latency: dbLatency,
      tables: dbTables
    }
  });
});

// JSON logs endpoint
app.get('/api/observability/logs', (req, res) => {
  res.json(recentLogs);
});

// Observation panel HTML page
app.get('/observability', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goo Events - Observability Console</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #040406;
      --bg-card: rgba(255, 255, 255, 0.02);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --violet-bright: #8b5cf6;
      --accent-pink: #ec4899;
      --accent-cyan: #06b6d4;
      --accent-gold: #f59e0b;
      --status-green: #10b981;
      --status-red: #ef4444;
      --text-main: #f3f4f6;
      --text-secondary: #9ca3af;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: 'Outfit', sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 40%);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 1.5rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--violet-bright), var(--accent-pink));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.05em;
    }

    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      border: 1px solid var(--border-subtle);
      background: rgba(255,255,255,0.05);
    }

    .badge.active {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: var(--status-green);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      background: var(--status-green);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--status-green);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 1rem;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
    }

    .col-4 { grid-column: span 4; }
    .col-8 { grid-column: span 8; }

    @media (max-width: 900px) {
      .col-4, .col-8 {
        grid-column: span 12;
      }
    }

    .card-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .metric-value {
      font-size: 2.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .metric-unit {
      font-size: 1rem;
      font-weight: 400;
      color: var(--text-secondary);
    }

    .status-text {
      font-size: 1rem;
      font-weight: 600;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .table-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .table-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }

    .table-name {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-main);
    }

    .table-count {
      font-weight: 700;
      color: var(--violet-bright);
    }

    .terminal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .terminal-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .filter-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .filter-btn.active {
      background: var(--violet-bright);
      border-color: var(--violet-bright);
      color: white;
    }

    .terminal-box {
      background: #020203;
      border: 1px solid var(--border-subtle);
      border-radius: 0.75rem;
      padding: 1rem;
      height: 400px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      scroll-behavior: smooth;
    }

    .log-line {
      display: flex;
      gap: 1rem;
      word-break: break-all;
    }

    .log-time {
      color: #555566;
      flex-shrink: 0;
    }

    .log-type {
      font-weight: 700;
      flex-shrink: 0;
      text-transform: uppercase;
      width: 45px;
    }

    .log-type.info { color: var(--accent-cyan); }
    .log-type.error { color: var(--status-red); }

    .log-msg {
      color: #e5e7eb;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <h1 class="logo">gooevents</h1>
        <span class="badge active"><span class="pulse-dot"></span>Observability Hub</span>
      </div>
      <div class="badge">API version: 1.0.0</div>
    </header>

    <div class="dashboard-grid">
      <!-- Server Health -->
      <div class="card col-4">
        <div class="card-title">Server Metrics</div>
        <div class="metric-value" id="server-uptime">0 <span class="metric-unit">s</span></div>
        <div class="status-text" style="color: var(--accent-cyan); margin-top: 0.5rem;">
          Uptime Counter
        </div>
        <div class="status-text" style="font-size: 0.8rem; font-weight: normal; margin-top: 1rem; color: var(--text-secondary);">
          Platform: <span id="server-platform">-</span> | Node: <span id="server-node">-</span>
        </div>
      </div>

      <!-- Memory Health -->
      <div class="card col-4">
        <div class="card-title">Memory Allocation</div>
        <div class="metric-value" id="server-memory">0 <span class="metric-unit">MB</span></div>
        <div class="status-text" style="color: var(--accent-pink); margin-top: 0.5rem;">
          Heap Used / RSS: <span id="server-rss">-</span> MB
        </div>
      </div>

      <!-- Database Connection Status -->
      <div class="card col-4">
        <div class="card-title">MySQL Database</div>
        <div class="status-text" id="db-status-badge" style="color: var(--status-red)">
          Checking Status...
        </div>
        <div class="status-text" style="font-size: 0.85rem; font-weight: normal; margin-top: 0.5rem; color: var(--text-secondary)">
          Latency Check: <span id="db-latency">-</span> ms
        </div>
      </div>

      <!-- Database Entities counts -->
      <div class="card col-4">
        <div class="card-title">Staged Entities (MySQL)</div>
        <div class="table-list" id="db-tables-list">
          <div style="font-size: 0.8rem; color: var(--text-secondary)">Querying database records count...</div>
        </div>
      </div>

      <!-- Log Console -->
      <div class="card col-8">
        <div class="terminal-header">
          <div class="card-title">Live Server Logs</div>
          <div class="terminal-controls">
            <label class="checkbox-container">
              <input type="checkbox" id="autoscroll-chk" checked> Auto-Scroll
            </label>
            <button class="filter-btn active" onclick="setFilter('ALL', this)">All</button>
            <button class="filter-btn" onclick="setFilter('INFO', this)">Info</button>
            <button class="filter-btn" onclick="setFilter('ERROR', this)">Errors</button>
          </div>
        </div>
        <div class="terminal-box" id="terminal-box">
          <div class="log-line"><span class="log-time">[System]</span> <span class="log-msg">Logs terminal loaded. Polling server logs...</span></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentFilter = 'ALL';
    let logsCache = [];

    function formatUptime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      let out = "";
      if (h > 0) out += h + "h ";
      if (m > 0 || h > 0) out += m + "m ";
      out += s + "s";
      return out;
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/observability/stats');
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('server-uptime').innerHTML = formatUptime(data.server.uptime);
        document.getElementById('server-platform').innerText = data.server.platform;
        document.getElementById('server-node').innerText = data.server.nodeVersion;
        
        document.getElementById('server-memory').innerHTML = data.server.memory.heapUsed + ' <span class="metric-unit">MB</span>';
        document.getElementById('server-rss').innerText = data.server.memory.rss;

        const dbBadge = document.getElementById('db-status-badge');
        if (data.database.status === 'Connected') {
          dbBadge.innerText = 'Connected / Healthy';
          dbBadge.style.color = 'var(--status-green)';
          document.getElementById('db-latency').innerText = data.database.latency;
        } else {
          dbBadge.innerText = 'Disconnected / Config Error';
          dbBadge.style.color = 'var(--status-red)';
          document.getElementById('db-latency').innerText = '-';
        }

        const tablesList = document.getElementById('db-tables-list');
        tablesList.innerHTML = '';
        if (data.database.tables.length === 0) {
          tablesList.innerHTML = '<div style="font-size:0.8rem; color:var(--text-secondary)">No tables found. Check db credentials.</div>';
        }
        data.database.tables.forEach(t => {
          const row = document.createElement('div');
          row.className = 'table-item';
          row.innerHTML = \`<span class="table-name">\${t.table}</span><span class="table-count">\${t.count}</span>\`;
          tablesList.appendChild(row);
        });

      } catch (err) {
        console.error("Failed to fetch server stats:", err);
      }
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/observability/logs');
        if (!res.ok) return;
        logsCache = await res.json();
        renderLogs();
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    }

    function setFilter(filter, element) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      element.classList.add('active');
      renderLogs();
    }

    function renderLogs() {
      const box = document.getElementById('terminal-box');
      const autoscroll = document.getElementById('autoscroll-chk').checked;
      
      const scrollPos = box.scrollTop;
      const scrollHeight = box.scrollHeight;
      const clientHeight = box.clientHeight;
      const wasAtBottom = (scrollHeight - scrollPos) <= (clientHeight + 20);

      box.innerHTML = '';
      
      const filteredLogs = logsCache.filter(log => {
        if (currentFilter === 'ALL') return true;
        return log.type.toUpperCase() === currentFilter;
      });

      if (filteredLogs.length === 0) {
        box.innerHTML = '<div class="log-line"><span class="log-time">[System]</span> <span class="log-msg">No logs found matching this filter.</span></div>';
        return;
      }

      filteredLogs.forEach(log => {
        const line = document.createElement('div');
        line.className = 'log-line';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        const date = new Date(log.timestamp);
        const timeStr = date.toTimeString().split(' ')[0] + '.' + String(date.getMilliseconds()).padStart(3, '0');
        timeSpan.innerText = \`[\${timeStr}]\`;
        
        const typeSpan = document.createElement('span');
        typeSpan.className = \`log-type \${log.type.toLowerCase()}\`;
        typeSpan.innerText = log.type;

        const msgSpan = document.createElement('span');
        msgSpan.className = 'log-msg';
        msgSpan.innerText = log.message;

        line.appendChild(timeSpan);
        line.appendChild(typeSpan);
        line.appendChild(msgSpan);
        box.appendChild(line);
      });

      if (autoscroll && wasAtBottom) {
        box.scrollTop = box.scrollHeight;
      }
    }

    fetchStats();
    fetchLogs();
    setInterval(fetchStats, 3000);
    setInterval(fetchLogs, 2000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Goo Events API Backend server is running on port ${PORT}`);
});
