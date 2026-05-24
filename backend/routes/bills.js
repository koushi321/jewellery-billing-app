const express = require('express')
const router  = express.Router()
const { db }  = require('../database')

// ── HELPER: Generate Bill Number ─────────────────────────
function generateBillNumber() {
  const year  = new Date().getFullYear()
  const bills = db.prepare('SELECT COUNT(*) as count FROM bills').get()
  const count  = String(bills.count + 1).padStart(3, '0')
  return `BILL-${year}-${count}`
}

// ── 1. GET ALL BILLS ─────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const bills = db.prepare(`
      SELECT * FROM bills ORDER BY created_at DESC
    `).all()
    res.json(bills)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 2. GET BILLS BY DATE ─────────────────────────────────
router.get('/date/:date', (req, res) => {
  try {
    const bills = db.prepare(`
      SELECT * FROM bills
      WHERE bill_date = ?
      ORDER BY created_at DESC
    `).all(req.params.date)
    res.json(bills)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 3. GET SINGLE BILL ───────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id)
    if (!bill) return res.status(404).json({ error: 'Bill not found' })
    res.json(bill)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 4. CREATE BILL ───────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      items,
      old_items,
      subtotal,
      old_items_total,
      discount,
      grand_total,
      bill_date
    } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Bill must have at least one item' })
    }

    const bill_number = generateBillNumber()

    // Save bill
    const billResult = db.prepare(`
      INSERT INTO bills (
        bill_number, customer_name, customer_phone,
        items_json, subtotal, discount, grand_total, bill_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bill_number,
      customer_name  || 'Walk-in Customer',
      customer_phone || '',
      JSON.stringify({ items, old_items: old_items || [] }),
      subtotal,
      discount    || 0,
      grand_total,
      bill_date
    )

    const billId = billResult.lastInsertRowid

    // Save each sale + reduce stock weight
    for (const item of items) {
      db.prepare(`
        INSERT INTO sales (
          bill_id, item_id, item_name, category,
          weight_sold_g, rate_per_gram,
          making_charges, total_price, sale_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        billId,
        item.item_id,
        item.item_name,
        item.category,
        item.actual_weight,
        item.rate,
        item.making_charges,
        item.total_price,
        bill_date
      )

      // Reduce stock weight
      db.prepare(`
        UPDATE stock
        SET
          total_weight_g = total_weight_g - ?,
          net_weight_g   = net_weight_g - ?,
          updated_at     = datetime('now')
        WHERE id = ?
      `).run(
        item.actual_weight,
        item.actual_weight,
        item.item_id
      )
    }

    const savedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId)
    res.json(savedBill)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router