const express = require('express')
const router  = express.Router()
const { db }  = require('../database')

// ── 1. ADD NEW LOAN ──────────────────────────────────────
router.post('/', (req, res) => {
  try {
    console.log('Received loan data:', req.body)

    const {
      loan_id,
      person_name,
      phone,
      address,
      gold_weight_g,
      net_weight_g,
      gold_purity,
      gold_value,
      loan_amount,
      interest_rate,
      loan_date,
      due_date,
      notes
    } = req.body

    if (!loan_id || !person_name || !gold_weight_g || !loan_amount || !interest_rate || !loan_date) {
      return res.status(400).json({ error: 'Please fill all required fields' })
    }

    const existing = db.prepare(
      'SELECT id FROM gold_loans WHERE person_id = ?'
    ).get(loan_id)

    if (existing) {
      return res.status(400).json({ error: 'Loan ID already exists. Use a different ID.' })
    }

    const result = db.prepare(`
      INSERT INTO gold_loans (
        person_id, person_name, phone, address,
        gold_weight_g, net_weight_g, gold_purity, gold_value,
        loan_amount, interest_rate, loan_date,
        due_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      loan_id,
      person_name,
      phone         || '',
      address       || '',
      gold_weight_g,
      net_weight_g  || 0,
      gold_purity   || '',
      gold_value    || 0,
      loan_amount,
      interest_rate,
      loan_date,
      due_date      || '',
      notes         || ''
    )

    console.log('Loan inserted with id:', result.lastInsertRowid)
    const newLoan = db.prepare(
      'SELECT * FROM gold_loans WHERE id = ?'
    ).get(result.lastInsertRowid)

    res.json(newLoan)

  } catch (err) {
    console.log('Error adding loan:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── 2. GET ALL LOANS ─────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const loans = db.prepare(`
      SELECT * FROM gold_loans
      ORDER BY created_at DESC
    `).all()
    res.json(loans)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 3. SEARCH CUSTOMER ───────────────────────────────────
router.get('/customer/search', (req, res) => {
  try {
    const { query } = req.query

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query too short' })
    }

    const searchTerm = `%${query}%`

    const bills = db.prepare(`
      SELECT * FROM bills
      WHERE customer_name LIKE ?
      OR customer_phone LIKE ?
      ORDER BY created_at DESC
    `).all(searchTerm, searchTerm)

    const loans = db.prepare(`
      SELECT * FROM gold_loans
      WHERE person_name LIKE ?
      OR phone LIKE ?
      ORDER BY created_at DESC
    `).all(searchTerm, searchTerm)

    res.json({ bills, loans })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 4. GET SINGLE LOAN ───────────────────────────────────
// ── 4. GET SINGLE LOAN ───────────────────────────────────
router.get('/:loanId', (req, res) => {
  try {
    const loan = db.prepare(`
      SELECT * FROM gold_loans WHERE person_id = ?
    `).get(req.params.loanId)

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }

    const payments = db.prepare(`
      SELECT * FROM loan_payments
      WHERE loan_id = ?
      ORDER BY payment_date ASC
    `).all(loan.id)

    // ── Interest Calculation ──────────────────────────────
    const loanDate  = new Date(loan.loan_date)

    // If loan is closed → use closed date
    // If loan is active → use today
    const endDate   = loan.status === 'closed' && loan.closed_date
      ? new Date(loan.closed_date)
      : new Date()

    const diffDays  = Math.floor((endDate - loanDate) / (1000 * 60 * 60 * 24))
    const months    = diffDays / 30
    const interest  = loan.loan_amount * (loan.interest_rate / 100) * months
    const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0)
    const totalDue  = loan.loan_amount + interest - totalPaid

    res.json({
      loan,
      payments,
      calculation: {
        diffDays    : Math.floor(diffDays),
        months      : months.toFixed(2),
        interest    : interest.toFixed(2),
        totalPaid   : totalPaid.toFixed(2),
        totalDue    : totalDue.toFixed(2),
        endDate     : endDate.toISOString().split('T')[0],
        isClosedLoan: loan.status === 'closed'
      }
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 5. ADD PAYMENT ───────────────────────────────────────
router.post('/:loanId/payment', (req, res) => {
  try {
    const { amount_paid, payment_date, notes } = req.body
    const loan = db.prepare(`
      SELECT * FROM gold_loans WHERE person_id = ?
    `).get(req.params.loanId)

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }

    db.prepare(`
      INSERT INTO loan_payments (loan_id, amount_paid, payment_date, notes)
      VALUES (?, ?, ?, ?)
    `).run(loan.id, amount_paid, payment_date, notes || '')

    res.json({ message: 'Payment recorded successfully' })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 6. CLOSE LOAN ────────────────────────────────────────
router.put('/:loanId/close', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const loan  = db.prepare(`
      SELECT * FROM gold_loans WHERE person_id = ?
    `).get(req.params.loanId)

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }

    db.prepare(`
      UPDATE gold_loans
      SET status = 'closed', closed_date = ?
      WHERE person_id = ?
    `).run(today, req.params.loanId)

    res.json({ message: 'Loan closed successfully' })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router