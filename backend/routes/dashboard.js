const express = require('express')
const router  = express.Router()
const { db }  = require('../database')

router.get('/summary/:date', (req, res) => {
  try {
    const { date } = req.params

    const bills = db.prepare(`
      SELECT * FROM bills
      WHERE bill_date = ?
      ORDER BY created_at DESC
    `).all(date)

    const sales = db.prepare(`
      SELECT * FROM sales
      WHERE sale_date = ?
    `).all(date)

    // Today's weight checks
    const weightChecks = db.prepare(`
      SELECT * FROM weight_checks
      WHERE check_date = ?
    `).all(date)

    const totalBills      = bills.length
    const totalRevenue    = bills.reduce((sum, b) => sum + b.grand_total, 0)
    const totalWeightSold = sales.reduce((sum, s) => sum + s.weight_sold_g, 0)

    // Gold silver pattilu breakdown from sales
    const goldSales    = sales.filter(s => s.category === 'Gold')
    const silverSales  = sales.filter(s => s.category === 'Silver')
    const pattiluSales = sales.filter(s => s.category === 'Pattilu')

    const goldWeight    = goldSales.reduce((sum, s) => sum + s.weight_sold_g, 0)
    const silverWeight  = silverSales.reduce((sum, s) => sum + s.weight_sold_g, 0)
    const pattiluWeight = pattiluSales.reduce((sum, s) => sum + s.weight_sold_g, 0)

    // Old gold and silver received from bills
    let oldGoldWeight   = 0
    let oldSilverWeight = 0

    for (const bill of bills) {
      try {
        const parsed   = JSON.parse(bill.items_json)
        const oldItems = Array.isArray(parsed) ? [] : parsed.old_items || []
        for (const old of oldItems) {
          if (old.category === 'Gold') {
            oldGoldWeight   += parseFloat(old.pure_weight) || 0
          } else if (old.category === 'Silver') {
            oldSilverWeight += parseFloat(old.pure_weight) || 0
          }
        }
      } catch (_err) {
        // skip
      }
    }

    // Pattilu check status
    const pattiluChecked   = weightChecks.length
    const pattiluMismatch  = weightChecks.filter(c => c.status === 'mismatch').length
    const pattiluAllMatch  = pattiluChecked > 0 && pattiluMismatch === 0

    res.json({
      date,
      summary: {
        totalBills,
        totalRevenue,
        totalWeightSold,
        goldWeight,
        silverWeight,
        pattiluWeight,
        oldGoldWeight,
        oldSilverWeight,
        pattiluChecked,
        pattiluMismatch,
        pattiluAllMatch
      },
      bills,
      sales,
      weightChecks
    })

  } catch (_err) {
    res.status(500).json({ error: 'Failed to load dashboard data' })
  }
})

module.exports = router