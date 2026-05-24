const express = require('express')
const router = express.Router()
const { db } = require('../database')

// ── 1. GET ALL STOCK ─────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM stock ORDER BY created_at DESC').all()
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 2. ADD NEW STOCK ITEM ────────────────────────────────
router.post('/', (req, res) => {
  try {
    const {
      name,
      category,
      box_name,
      total_weight_g,
      box_weight_g,
      reorder_weight_g
    } = req.body

    if (!name || !category || !total_weight_g) {
      return res.status(400).json({ error: 'Please fill all required fields' })
    }

    let net_weight_g
    let finalBoxWeight
    let finalTotalWeight

    if (category === 'Silver') {
      // Silver → has box weight
      if (!box_weight_g) {
        return res.status(400).json({ error: 'Box weight is required for silver items' })
      }
      net_weight_g     = total_weight_g - box_weight_g
      finalBoxWeight   = box_weight_g
      finalTotalWeight = total_weight_g

      if (net_weight_g < 0) {
        return res.status(400).json({ error: 'Total weight must be greater than box weight' })
      }

    } else {
      // Gold → no box weight
      // total weight = net weight = actual gold weight
      net_weight_g     = total_weight_g
      finalBoxWeight   = 0
      finalTotalWeight = total_weight_g
    }

    const result = db.prepare(`
      INSERT INTO stock (
        name, category, box_name,
        total_weight_g, box_weight_g,
        net_weight_g, reorder_weight_g
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      category,
      box_name || '',
      finalTotalWeight,
      finalBoxWeight,
      net_weight_g,
      reorder_weight_g || 10
    )

    const newItem = db.prepare('SELECT * FROM stock WHERE id = ?').get(result.lastInsertRowid)
    res.json(newItem)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 3. UPDATE STOCK ITEM ─────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      category,
      box_name,
      total_weight_g,
      box_weight_g,
      reorder_weight_g
    } = req.body

    let net_weight_g
    let finalBoxWeight
    let finalTotalWeight

    if (category === 'Silver'|| category === 'Pattilu') {
      net_weight_g     = total_weight_g - box_weight_g
      finalBoxWeight   = box_weight_g
      finalTotalWeight = total_weight_g
    } else {
      // Gold → no box weight
      net_weight_g     = total_weight_g
      finalBoxWeight   = 0
      finalTotalWeight = total_weight_g
    }

    db.prepare(`
      UPDATE stock
      SET
        name             = ?,
        category         = ?,
        box_name         = ?,
        total_weight_g   = ?,
        box_weight_g     = ?,
        net_weight_g     = ?,
        reorder_weight_g = ?,
        updated_at       = datetime('now')
      WHERE id = ?
    `).run(
      name,
      category,
      box_name || '',
      finalTotalWeight,
      finalBoxWeight,
      net_weight_g,
      reorder_weight_g,
      id
    )

    const updatedItem = db.prepare('SELECT * FROM stock WHERE id = ?').get(id)
    res.json(updatedItem)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 4. DELETE STOCK ITEM ─────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    db.prepare('DELETE FROM stock WHERE id = ?').run(id)
    res.json({ message: 'Item deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router