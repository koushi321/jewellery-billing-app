const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// ── LOGIN ROUTE ──────────────────────────────────────────
// POST /api/auth/login
router.post('/login', (req, res) => {

  // 1. Get username and password from request
  const { username, password } = req.body;

  // 2. Check if username matches
  if (username !== process.env.ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // 3. Check if password matches
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // 4. Create a token
  const token = jwt.sign(
    { username },              // data inside token
    process.env.JWT_SECRET,    // secret key to sign it
    { expiresIn: '7d' }        // token expires in 7 days
  );

  // 5. Send token back to frontend
  res.json({
    message: 'Login successful',
    token
  });

});

module.exports = router;