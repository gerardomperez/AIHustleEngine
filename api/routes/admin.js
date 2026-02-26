const express = require('express');
const router = express.Router();
const db = require('../database');

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Get dashboard stats
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const totalUsers = db.getTotalUsers.get();
    const totalPurchases = db.getTotalPurchases.get();
    const revenue = db.getRevenue.get();
    
    // Get tier breakdown
    const tierBreakdown = db.db.prepare(`
      SELECT tier, COUNT(*) as count, SUM(amount_cents) as revenue
      FROM purchases 
      WHERE status = 'completed'
      GROUP BY tier
    `).all();
    
    // Get daily sales for last 30 days
    const dailySales = db.db.prepare(`
      SELECT 
        DATE(purchased_at) as date,
        COUNT(*) as sales,
        SUM(amount_cents) as revenue
      FROM purchases
      WHERE status = 'completed'
        AND purchased_at >= DATE('now', '-30 days')
      GROUP BY DATE(purchased_at)
      ORDER BY date DESC
    `).all();
    
    res.json({
      totalUsers: totalUsers.count,
      totalPurchases: totalPurchases.count,
      totalRevenue: revenue.total || 0,
      tierBreakdown,
      dailySales
    });
    
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get all users
router.get('/users', requireAdmin, (req, res) => {
  try {
    const { page = 1, limit = 50, tier, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        u.id, u.email, u.name, u.created_at, u.last_login,
        (SELECT tier FROM purchases WHERE user_id = u.id AND status = 'completed' ORDER BY id DESC LIMIT 1) as tier,
        (SELECT COUNT(*) FROM course_progress WHERE user_id = u.id AND completed = 1) as lessons_completed
      FROM users u
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (u.email LIKE ? OR u.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const users = db.db.prepare(query).all(...params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM users u WHERE 1=1`;
    if (search) {
      countQuery += ` AND (u.email LIKE ? OR u.name LIKE ?)`;
    }
    const total = db.db.prepare(countQuery).get(...(search ? [`%${search}%`, `%${search}%`] : []));
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.total,
        pages: Math.ceil(total.total / limit)
      }
    });
    
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user details
router.get('/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    const user = db.getUserById.get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const purchases = db.getPurchasesByUser.all(id);
    const progress = db.getProgress.all(id);
    
    res.json({
      user,
      purchases,
      progress,
      stats: {
        totalLessonsCompleted: progress.filter(p => p.completed).length,
        totalModulesStarted: new Set(progress.map(p => p.module_number)).size
      }
    });
    
  } catch (err) {
    console.error('User detail error:', err);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Get all purchases
router.get('/purchases', requireAdmin, (req, res) => {
  try {
    const { page = 1, limit = 50, tier } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        p.id, p.tier, p.amount_cents, p.status, p.purchased_at,
        u.email, u.name
      FROM purchases p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (tier) {
      query += ` AND p.tier = ?`;
      params.push(tier);
    }
    
    query += ` ORDER BY p.purchased_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const purchases = db.db.prepare(query).all(...params);
    
    res.json({
      purchases: purchases.map(p => ({
        ...p,
        amount: p.amount_cents / 100
      }))
    });
    
  } catch (err) {
    console.error('Purchases error:', err);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

// Get course progress overview
router.get('/progress', requireAdmin, (req, res) => {
  try {
    // Progress by module
    const moduleProgress = db.db.prepare(`
      SELECT 
        module_number,
        COUNT(DISTINCT user_id) as users_started,
        COUNT(CASE WHEN completed = 1 THEN 1 END) as lessons_completed
      FROM course_progress
      GROUP BY module_number
      ORDER BY module_number
    `).all();
    
    // Completion rates
    const totalUsers = db.getTotalUsers.get().count;
    const usersWithProgress = db.db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM course_progress
    `).get();
    
    res.json({
      moduleProgress,
      totalUsers,
      engagedUsers: usersWithProgress.count,
      engagementRate: totalUsers > 0 ? (usersWithProgress.count / totalUsers * 100).toFixed(1) : 0
    });
    
  } catch (err) {
    console.error('Progress error:', err);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Export users as CSV
router.get('/export/users', requireAdmin, (req, res) => {
  try {
    const users = db.db.prepare(`
      SELECT 
        u.email, u.name, u.created_at, u.last_login,
        (SELECT tier FROM purchases WHERE user_id = u.id AND status = 'completed' ORDER BY id DESC LIMIT 1) as tier
      FROM users u
      ORDER BY u.created_at DESC
    `).all();
    
    let csv = 'Email,Name,Created At,Last Login,Tier\n';
    users.forEach(u => {
      csv += `"${u.email}","${u.name || ''}","${u.created_at}","${u.last_login || ''}","${u.tier || ''}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
    
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// Send email to user (via n8n webhook)
router.post('/send-email', requireAdmin, async (req, res) => {
  try {
    const { userId, subject, message } = req.body;
    
    const user = db.getUserById.get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Trigger n8n webhook for email
    const n8nWebhook = process.env.N8N_ADMIN_EMAIL_WEBHOOK;
    if (n8nWebhook) {
      await fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject,
          message,
          userId: user.id
        })
      });
    }
    
    res.json({ success: true, message: 'Email queued for sending' });
    
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
