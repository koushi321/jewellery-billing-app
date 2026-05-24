const express = require('express')
const router  = express.Router()
const { db }  = require('../database')

// ── 1. GET TODAY'S CHECK ─────────────────────────────────
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get all pattilu stock items
    const pattiluItems = db.prepare(`
      SELECT * FROM stock
      WHERE category = 'Pattilu'
      ORDER BY name ASC
    `).all()

    // Get today's checks
    const todayChecks = db.prepare(`
      SELECT * FROM weight_checks
      WHERE check_date = ?
    `).all(today)

    res.json({ pattiluItems, todayChecks, date: today })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 2. GET CHECK HISTORY ─────────────────────────────────
router.get('/history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM weight_checks
      ORDER BY created_at DESC
      LIMIT 100
    `).all()
    res.json(history)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 3. SAVE WEIGHT CHECK ─────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { checks, check_date } = req.body
    // checks = array of { item_id, item_name, expected_weight, actual_weight, notes }

    if (!checks || checks.length === 0) {
      return res.status(400).json({ error: 'No checks provided' })
    }

    // Delete existing checks for today to avoid duplicates
    db.prepare(`
      DELETE FROM weight_checks WHERE check_date = ?
    `).run(check_date)

    // Save all checks
    for (const check of checks) {
      const difference = check.actual_weight - check.expected_weight
      const status     = Math.abs(difference) <= 0.5 ? 'match' : 'mismatch'

      db.prepare(`
        INSERT INTO weight_checks (
          check_date, item_id, item_name,
          expected_weight, actual_weight,
          difference, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        check_date,
        check.item_id,
        check.item_name,
        check.expected_weight,
        check.actual_weight,
        difference,
        status,
        check.notes || ''
      )
    }

    res.json({ message: 'Weight check saved successfully!' })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router