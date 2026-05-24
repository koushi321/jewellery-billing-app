const Database = require('better-sqlite3')
const path     = require('path')

const db = new Database(path.join(__dirname, 'toolshop.db'))

db.pragma('journal_mode = WAL')

function initializeDatabase() {

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL,
      category         TEXT NOT NULL,
      box_name         TEXT,
      total_weight_g   REAL NOT NULL,
      box_weight_g     REAL NOT NULL,
      net_weight_g     REAL NOT NULL,
      reorder_weight_g REAL DEFAULT 10,
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number    TEXT UNIQUE NOT NULL,
      customer_name  TEXT,
      customer_phone TEXT,
      items_json     TEXT NOT NULL,
      subtotal       REAL NOT NULL,
      discount       REAL DEFAULT 0,
      grand_total    REAL NOT NULL,
      gold_rate      REAL,
      silver_rate    REAL,
      bill_date      TEXT NOT NULL,
      created_at     TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id        INTEGER,
      item_id        INTEGER,
      item_name      TEXT NOT NULL,
      category       TEXT NOT NULL,
      weight_sold_g  REAL NOT NULL,
      rate_per_gram  REAL NOT NULL,
      making_charges REAL DEFAULT 0,
      total_price    REAL NOT NULL,
      sale_date      TEXT NOT NULL,
      created_at     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bill_id) REFERENCES bills(id),
      FOREIGN KEY (item_id) REFERENCES stock(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_loans (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id     TEXT UNIQUE NOT NULL,
      person_name   TEXT NOT NULL,
      phone         TEXT,
      address       TEXT,
      gold_weight_g REAL NOT NULL,
      net_weight_g  REAL DEFAULT 0,
      gold_purity   TEXT NOT NULL,
      gold_value    REAL DEFAULT 0,
      loan_amount   REAL NOT NULL,
      interest_rate REAL NOT NULL,
      loan_date     TEXT NOT NULL,
      due_date      TEXT,
      status        TEXT DEFAULT 'active',
      closed_date   TEXT,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS loan_payments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id      INTEGER NOT NULL,
      amount_paid  REAL NOT NULL,
      payment_date TEXT NOT NULL,
      notes        TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES gold_loans(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS weight_checks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      check_date      TEXT NOT NULL,
      item_id         INTEGER NOT NULL,
      item_name       TEXT NOT NULL,
      expected_weight REAL NOT NULL,
      actual_weight   REAL NOT NULL,
      difference      REAL NOT NULL,
      status          TEXT NOT NULL,
      notes           TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES stock(id)
    )
  `)

  console.log('✅ All tables created successfully')
}

module.exports = { db, initializeDatabase }