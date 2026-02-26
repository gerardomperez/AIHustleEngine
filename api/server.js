require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3457;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://ai-hustle.advancedmedias.com',
  credentials: true
}));
app.use(express.json());

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Check tier access
const requireTier = (tier) => {
  return (req, res, next) => {
    const userTier = req.user.tier;
    const tierLevels = { starter: 1, accelerator: 2, inner_circle: 3 };
    
    if (tierLevels[userTier] >= tierLevels[tier]) {
      next();
    } else {
      res.status(403).json({ error: 'Tier upgrade required' });
    }
  };
};

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      db.createUser.run(email.toLowerCase().trim(), name || null, hashedPassword);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw err;
    }
    
    const user = db.getUserByEmail.get(email.toLowerCase().trim());
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = db.getUserByEmail.get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    db.updateLastLogin.run(user.id);
    
    // Get user's tier
    const tierResult = db.getUserTier.get(user.id);
    const tier = tierResult.tier || null;
    
    const token = jwt.sign({ id: user.id, email: user.email, tier }, JWT_SECRET);
    
    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, email: user.email, name: user.name, tier } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Course routes
app.get('/course/modules', authenticateToken, (req, res) => {
  // Return course structure based on user's tier
  const modules = require('./course-content.json');
  res.json(modules);
});

app.get('/course/progress', authenticateToken, (req, res) => {
  const progress = db.getProgress.all(req.user.id);
  res.json(progress);
});

app.post('/course/progress/:module/:lesson', authenticateToken, (req, res) => {
  const { module, lesson } = req.params;
  const { completed } = req.body;
  
  db.updateProgress.run(req.user.id, parseInt(module), parseInt(lesson), completed ? 1 : 0, completed ? 1 : 0);
  res.json({ success: true });
});

// Prompt Vault
app.get('/prompts', authenticateToken, (req, res) => {
  const prompts = require('./prompt-vault.json');
  res.json(prompts);
});

app.get('/prompts/favorites', authenticateToken, (req, res) => {
  // Get user's favorite prompts
  res.json([]); // Placeholder
});

// Playbook — available to all tiers
app.get('/playbook', authenticateToken, (req, res) => {
  try {
    const playbook = require('./playbook.json');
    res.json(playbook);
  } catch (e) {
    res.status(404).json({ error: 'Playbook not yet available' });
  }
});

// Templates — accelerator and above
app.get('/templates', authenticateToken, requireTier('accelerator'), (req, res) => {
  try {
    const templates = require('./templates.json');
    res.json(templates);
  } catch (e) {
    res.status(404).json({ error: 'Templates not yet available' });
  }
});

app.get('/templates/:id', authenticateToken, requireTier('accelerator'), (req, res) => {
  try {
    const templates = require('./templates.json');
    const template = (templates.templates || templates).find(t => t.id === req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (e) {
    res.status(404).json({ error: 'Templates not yet available' });
  }
});

// Routes
app.use('/payments', require('./routes/payments'));
app.use('/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI Hustle Engine API running on port ${PORT}`);
});
