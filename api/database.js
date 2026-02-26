const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'ai-hustle.db'));

// Initialize tables
db.exec(`
  -- Users/Customers table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
  );

  -- Purchases table
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tier TEXT NOT NULL CHECK(tier IN ('starter', 'accelerator', 'inner_circle')),
    amount_cents INTEGER NOT NULL,
    stripe_payment_id TEXT,
    status TEXT DEFAULT 'completed',
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Course Progress table
  CREATE TABLE IF NOT EXISTS course_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module_number INTEGER NOT NULL,
    lesson_number INTEGER,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, module_number, lesson_number)
  );

  -- Email sequences table (for tracking which emails sent)
  CREATE TABLE IF NOT EXISTS email_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sequence_type TEXT NOT NULL, -- 'nurture', 'sales', 'onboarding'
    email_number INTEGER NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    opened BOOLEAN DEFAULT 0,
    clicked BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Prompt Vault Favorites
  CREATE TABLE IF NOT EXISTS prompt_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    prompt_id TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, prompt_id)
  );

  -- Coaching Sessions (for Tier 3)
  CREATE TABLE IF NOT EXISTS coaching_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scheduled_at DATETIME,
    completed BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Analytics/Tracking
  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    user_id INTEGER,
    referrer TEXT,
    user_agent TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- A/B Test results
  CREATE TABLE IF NOT EXISTS ab_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name TEXT NOT NULL,
    variant TEXT NOT NULL,
    user_id INTEGER,
    converted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Helper functions
const dbHelpers = {
  // Users
  createUser: db.prepare(`
    INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)
  `),
  
  getUserByEmail: db.prepare(`SELECT * FROM users WHERE email = ?`),
  
  getUserById: db.prepare(`SELECT * FROM users WHERE id = ?`),
  
  updateLastLogin: db.prepare(`
    UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
  `),

  // Purchases
  createPurchase: db.prepare(`
    INSERT INTO purchases (user_id, tier, amount_cents, stripe_payment_id) 
    VALUES (?, ?, ?, ?)
  `),
  
  getPurchasesByUser: db.prepare(`
    SELECT * FROM purchases WHERE user_id = ? ORDER BY purchased_at DESC
  `),
  
  getUserTier: db.prepare(`
    SELECT MAX(tier) as tier FROM purchases 
    WHERE user_id = ? AND status = 'completed'
  `),

  // Course Progress
  updateProgress: db.prepare(`
    INSERT INTO course_progress (user_id, module_number, lesson_number, completed, completed_at)
    VALUES (?, ?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
    ON CONFLICT(user_id, module_number, lesson_number) DO UPDATE SET
      completed = excluded.completed,
      completed_at = excluded.completed_at,
      last_accessed = CURRENT_TIMESTAMP
  `),
  
  getProgress: db.prepare(`
    SELECT * FROM course_progress WHERE user_id = ? ORDER BY module_number, lesson_number
  `),
  
  getCompletedModules: db.prepare(`
    SELECT DISTINCT module_number FROM course_progress 
    WHERE user_id = ? AND completed = 1
  `),

  // Email sequences
  logEmailSent: db.prepare(`
    INSERT INTO email_sequences (user_id, sequence_type, email_number) VALUES (?, ?, ?)
  `),
  
  getEmailsSent: db.prepare(`
    SELECT * FROM email_sequences WHERE user_id = ? ORDER BY sent_at DESC
  `),

  // Analytics
  logPageView: db.prepare(`
    INSERT INTO page_views (path, user_id, referrer, user_agent, ip) 
    VALUES (?, ?, ?, ?, ?)
  `),
  
  logABTest: db.prepare(`
    INSERT INTO ab_tests (test_name, variant, user_id) VALUES (?, ?, ?)
  `),
  
  updateABConversion: db.prepare(`
    UPDATE ab_tests SET converted = 1 
    WHERE test_name = ? AND user_id = ?
  `),

  // Stats
  getTotalUsers: db.prepare(`SELECT COUNT(*) as count FROM users WHERE is_active = 1`),
  getTotalPurchases: db.prepare(`SELECT COUNT(*) as count FROM purchases WHERE status = 'completed'`),
  getRevenue: db.prepare(`SELECT SUM(amount_cents) as total FROM purchases WHERE status = 'completed'`),
};

module.exports = { db, ...dbHelpers };
