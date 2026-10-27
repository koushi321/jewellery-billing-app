import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useTheme } from '../context/ThemeContext'
import { getTheme } from '../context/theme'

// Opens the laptop webcam or phone camera and reads one barcode.
// onScan(text) is called once with the scanned text. onClose() closes the window.
function CameraScanner({ onScan, onClose }) {
  const { isDark } = useTheme()
  const theme      = getTheme(isDark)

  const [error, setError] = useState('')
  const onScanRef = useRef(onScan)
  const doneRef   = useRef(false)

  useEffect(() => {
    onScanRef.current = onScan
  })

  useEffect(() => {
    const scanner = new Html5Qrcode('camera-reader', {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE
      ],
      verbose: false
    })

    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        {
          fps  : 10,
          qrbox: (w, h) => ({
            width : Math.floor(w * 0.85),
            height: Math.floor(Math.min(h, w) * 0.45)
          })
        },
        (text) => {
          if (doneRef.current) return
          doneRef.current = true
          onScanRef.current(text)
        },
        () => {}
      )
      .catch((err) => {
        const msg = String(err)
        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setError('Camera permission was blocked. Allow the camera in your browser address bar and try again.')
        } else if (msg.includes('NotFound')) {
          setError('No camera was found on this device.')
        } else {
          setError('Could not start the camera. Close other apps using it and try again.')
        }
      })

    return () => {
      startPromise
        .then(() => scanner.stop())
        .then(() => scanner.clear())
        .catch(() => {})
    }
  }, [])

  return (
    <div style={{
      position       : 'fixed',
      inset          : 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex         : 2000,
      display        : 'flex',
      alignItems     : 'center',
      justifyContent : 'center',
      padding        : '16px'
    }}>
      <div style={{
        backgroundColor: theme.cardBg,
        borderRadius   : '16px',
        padding        : '20px',
        width          : '100%',
        maxWidth       : '460px',
        maxHeight      : '92dvh',
        overflowY      : 'auto',
        boxShadow      : theme.shadowCard
      }}>
        <div style={{
          display       : 'flex',
          justifyContent: 'space-between',
          alignItems    : 'center',
          marginBottom  : '12px'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: theme.textPrimary }}>
            Scan with camera
          </div>
          <button
            onClick={onClose}
            style={{
              border         : 'none',
              backgroundColor: 'transparent',
              color          : theme.textSecondary,
              fontSize       : '22px',
              cursor         : 'pointer',
              lineHeight     : 1
            }}
          >
            ×
          </button>
        </div>

        <div id="camera-reader" style={{ width: '100%', borderRadius: '10px', overflow: 'hidden' }} />

        {error ? (
          <div style={{
            marginTop      : '12px',
            padding        : '10px',
            borderRadius   : '8px',
            backgroundColor: '#fee2e2',
            color          : '#dc2626',
            fontSize       : '13px'
          }}>
            {error}
          </div>
        ) : (
          <div style={{ marginTop: '12px', fontSize: '12px', color: theme.textSecondary }}>
            Hold the barcode steady in front of the camera, with good light.
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraScanner
