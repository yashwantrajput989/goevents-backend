const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

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
  // Check if profiles table is empty
  const [profiles] = await connection.query("SELECT COUNT(*) as count FROM profiles");
  if (profiles[0].count === 0) {
    console.log("Seeding default profiles...");
    await connection.query(`
      INSERT INTO profiles (id, full_name, username, email, avatar_url, role, city, phone, onboarded, interests)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(['Music', 'Comedy'])
    ]);
  }

  // Check if companies table is empty
  const [companies] = await connection.query("SELECT COUNT(*) as count FROM companies");
  if (companies[0].count === 0) {
    console.log("Seeding default companies (Artists)...");
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
        false,
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
      ]
    ];

    for (const c of demoCompanies) {
      await connection.query(`
        INSERT INTO companies (id, name, admin_user_id, city, description, website, contact_email, phone, payout_upi, verified, category, genres, gallery_images, video_url, booking_price, social_links)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, c);
    }
  }

  // Check if events table is empty
  const [events] = await connection.query("SELECT COUNT(*) as count FROM events");
  if (events[0].count === 0) {
    console.log("Seeding default events...");
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
        'comp_test_1',
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
        'comp_test_1',
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
      ]
    ];

    for (const e of demoEvents) {
      await connection.query(`
        INSERT INTO events (id, company_id, title, short_description, description, venue_name, city, category, price, cover_image, start_date, status, tickets_sold, ticket_types)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, e);
    }
  }

  // Check if shows table is empty (legacy support)
  const [showsCount] = await connection.query("SELECT COUNT(*) as count FROM shows");
  if (showsCount[0].count === 0) {
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

    console.log("Database tables verified/created successfully.");
    
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
    console.error("Get events error:", err);
    res.status(500).json({ error: 'Database error' });
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
    console.error("Get event error:", err);
    res.status(500).json({ error: 'Database error' });
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
    console.error("Get user bookings error:", err);
    res.status(500).json({ error: 'Database error' });
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
    console.error("Admin dashboard data error:", err);
    res.status(500).json({ error: 'Database error' });
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
      category, genres, gallery_images, video_url, booking_price, social_links
    } = req.body;

    const updatedName = name !== undefined ? name : company.name;
    const updatedPhone = phone !== undefined ? phone : company.phone;
    const updatedWebsite = website !== undefined ? website : company.website;
    const updatedDescription = description !== undefined ? description : company.description;
    const updatedPayoutUpi = payout_upi !== undefined ? payout_upi : company.payout_upi;
    const updatedContactEmail = contact_email !== undefined ? contact_email : company.contact_email;
    const updatedCategory = category !== undefined ? category : company.category;
    const updatedGenres = genres !== undefined ? JSON.stringify(genres) : company.genres;
    const updatedGalleryImages = gallery_images !== undefined ? JSON.stringify(gallery_images) : company.gallery_images;
    const updatedVideoUrl = video_url !== undefined ? video_url : company.video_url;
    const updatedBookingPrice = booking_price !== undefined ? parseFloat(booking_price) : company.booking_price;
    const updatedSocialLinks = social_links !== undefined ? JSON.stringify(social_links) : company.social_links;

    await pool.query(`
      UPDATE companies SET
        name = ?, phone = ?, website = ?, description = ?, payout_upi = ?, contact_email = ?,
        category = ?, genres = ?, gallery_images = ?, video_url = ?, booking_price = ?, social_links = ?
      WHERE id = ?
    `, [
      updatedName, updatedPhone, updatedWebsite, updatedDescription, updatedPayoutUpi, updatedContactEmail,
      updatedCategory, updatedGenres, updatedGalleryImages, updatedVideoUrl, updatedBookingPrice, updatedSocialLinks,
      req.params.id
    ]);

    res.json({ message: 'Company updated successfully' });
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

    res.json({
      events: parsedEvents,
      companies: parsedCompanies,
      stats: {
        totalRevenue,
        totalBookings,
        activeEvents
      }
    });
  } catch (err) {
    console.error("Global admin stats error:", err);
    res.status(500).json({ error: 'Database error' });
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
    console.error("Get artists error:", err);
    res.status(500).json({ error: 'Database error' });
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
    console.error("Get artist details error:", err);
    res.status(500).json({ error: 'Database error' });
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

app.listen(PORT, () => {
  console.log(`Goo Events API Backend server is running on port ${PORT}`);
});
