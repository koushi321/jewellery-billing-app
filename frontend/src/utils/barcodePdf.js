import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'

const PAGE_W = 210 // A4 width in mm
const PAGE_H = 297 // A4 height in mm

const clamp = (value, min, max, fallback) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// Builds an A4 PDF with one barcode per label, laid out in a grid.
// codes  : array of barcode IDs, e.g. ['PJ-000001', 'PJ-000002']
// options: labelW / labelH in mm, margin in mm, cutLines true/false
export function buildBarcodePdf(codes, options = {}) {
  const labelW   = clamp(options.labelW, 20, 190, 45)
  const labelH   = clamp(options.labelH, 12, 280, 25)
  const margin   = clamp(options.margin, 0, 30, 8)
  const cutLines = options.cutLines !== false

  const cols    = Math.max(1, Math.floor((PAGE_W - 2 * margin) / labelW))
  const rows    = Math.max(1, Math.floor((PAGE_H - 2 * margin) / labelH))
  const perPage = cols * rows

  // Centre the grid left-to-right so both side gaps match
  const offsetX = (PAGE_W - cols * labelW) / 2
  const offsetY = margin

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  codes.forEach((code, i) => {
    if (i > 0 && i % perPage === 0) doc.addPage()

    const slot = i % perPage
    const col  = slot % cols
    const row  = Math.floor(slot / cols)
    const x    = offsetX + col * labelW
    const y    = offsetY + row * labelH

    if (cutLines) {
      doc.setDrawColor(190)
      doc.setLineWidth(0.1)
      doc.rect(x, y, labelW, labelH)
    }

    // Draw the barcode (with the ID printed under the bars) on a canvas
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, code, {
      format       : 'CODE128',
      width        : 3,
      height       : 80,
      displayValue : true,
      fontSize     : 24,
      textMargin   : 2,
      margin       : 8,
      background   : '#ffffff',
      lineColor    : '#000000'
    })

    // Fit the barcode inside the label, keeping its shape
    const pad    = 1.5
    const maxW   = labelW - 2 * pad
    const maxH   = labelH - 2 * pad
    const ratio  = canvas.width / canvas.height
    let drawW    = maxW
    let drawH    = drawW / ratio
    if (drawH > maxH) {
      drawH = maxH
      drawW = drawH * ratio
    }

    doc.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      x + (labelW - drawW) / 2,
      y + (labelH - drawH) / 2,
      drawW,
      drawH,
      undefined,
      'FAST'
    )
  })

  return doc
}

export function labelsPerPage(options = {}) {
  const labelW = clamp(options.labelW, 20, 190, 45)
  const labelH = clamp(options.labelH, 12, 280, 25)
  const margin = clamp(options.margin, 0, 30, 8)
  const cols   = Math.max(1, Math.floor((PAGE_W - 2 * margin) / labelW))
  const rows   = Math.max(1, Math.floor((PAGE_H - 2 * margin) / labelH))
  return cols * rows
}

export function fileNameFor(codes) {
  if (codes.length === 1) return `barcode-${codes[0]}.pdf`
  return `barcodes-${codes[0]}-to-${codes[codes.length - 1]}.pdf`
}

// Opens the PDF in a new tab and starts the print dialog
export function printBarcodePdf(codes, options) {
  const doc = buildBarcodePdf(codes, options)
  doc.autoPrint()
  window.open(doc.output('bloburl'), '_blank')
}

export function downloadBarcodePdf(codes, options) {
  const doc = buildBarcodePdf(codes, options)
  doc.save(fileNameFor(codes))
}
