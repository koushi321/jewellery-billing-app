import { supabase } from '../supabase'

// Every table in the app. Each one becomes a sheet in the Excel file.
export const BACKUP_TABLES = [
  { table: 'bills',            sheet: 'Bills' },
  { table: 'sales',            sheet: 'Sales' },
  { table: 'stock',            sheet: 'Stock' },
  { table: 'items',            sheet: 'Barcode Items' },
  { table: 'gold_loans',       sheet: 'Gold Loans' },
  { table: 'loan_payments',    sheet: 'Loan Payments' },
  { table: 'scheme_customers', sheet: 'Scheme Customers' },
  { table: 'scheme_plans',     sheet: 'Scheme Plans' },
  { table: 'scheme_payments',  sheet: 'Scheme Payments' },
  { table: 'weight_checks',    sheet: 'Weight Checks' }
]

const LAST_BACKUP_KEY = 'lastBackupAt'
const PAGE_SIZE       = 1000

// Reads every row of one table (Supabase returns at most 1000 rows per request)
const fetchAllRows = async (table) => {
  let from = 0
  let all  = []
  for (;;) {
    let { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    // A table without an "id" column: read it without sorting
    if (error && String(error.message || '').includes('id')) {
      ;({ data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + PAGE_SIZE - 1))
    }

    if (error) throw error
    all = all.concat(data || [])
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

// Loads all tables. A table that fails is reported, and the others still load.
export const loadBackupData = async () => {
  const results = []
  for (const { table, sheet } of BACKUP_TABLES) {
    try {
      results.push({ table, sheet, rows: await fetchAllRows(table), failed: false })
    } catch {
      results.push({ table, sheet, rows: [], failed: true })
    }
  }
  return results
}

const toCell = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

// Builds the Excel workbook: a Summary sheet plus one sheet per table
export const buildBackupWorkbook = (ExcelJS, results, createdAt = new Date()) => {
  const wb = new ExcelJS.Workbook()
  wb.created = createdAt

  const summary = wb.addWorksheet('Summary')
  summary.columns = [
    { header: 'Table', key: 'table', width: 24 },
    { header: 'Rows',  key: 'rows',  width: 10 },
    { header: 'Status', key: 'status', width: 14 }
  ]
  summary.getRow(1).font = { bold: true }
  summary.addRow({ table: 'Backup created', rows: '', status: createdAt.toLocaleString('en-IN') })
  results.forEach((r) => {
    summary.addRow({ table: r.sheet, rows: r.rows.length, status: r.failed ? 'FAILED' : 'OK' })
  })

  results.forEach((r) => {
    if (r.failed) return
    const sheet = wb.addWorksheet(r.sheet)
    const keys  = []
    r.rows.forEach((row) => {
      Object.keys(row).forEach((k) => { if (!keys.includes(k)) keys.push(k) })
    })
    if (keys.length === 0) return
    sheet.columns = keys.map((k) => ({ header: k, key: k, width: Math.max(14, Math.min(40, k.length + 4)) }))
    sheet.getRow(1).font = { bold: true }
    r.rows.forEach((row) => {
      const out = {}
      keys.forEach((k) => { out[k] = toCell(row[k]) })
      sheet.addRow(out)
    })
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  })

  return wb
}

const pad = (n) => String(n).padStart(2, '0')

// Downloads the backup. Returns { failed: [table names], fileName }
export const downloadBackup = async () => {
  const results = await loadBackupData()
  const { default: ExcelJS } = await import('exceljs')
  const now = new Date()
  const wb  = buildBackupWorkbook(ExcelJS, results, now)

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const fileName = `shop-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)

  const failed = results.filter((r) => r.failed).map((r) => r.sheet)
  if (failed.length === 0) {
    try { localStorage.setItem(LAST_BACKUP_KEY, now.toISOString()) } catch { /* ignore */ }
  }
  return { failed, fileName }
}

// How long ago the last complete backup was made on this browser
export const getBackupStatus = () => {
  try {
    const iso = localStorage.getItem(LAST_BACKUP_KEY)
    if (!iso) return { last: null, days: null }
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    return { last: iso, days }
  } catch {
    return { last: null, days: null }
  }
}
