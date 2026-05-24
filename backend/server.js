const express    = require('express')
const cors       = require('cors')
const dotenv     = require('dotenv')
const { initializeDatabase } = require('./database')

const authRoutes        = require('./routes/auth')
const stockRoutes       = require('./routes/stock')
const billRoutes        = require('./routes/bills')
const dashboardRoutes   = require('./routes/dashboard')
const goldloanRoutes    = require('./routes/goldloan')
const weightCheckRoutes = require('./routes/weightcheck')

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

initializeDatabase()

app.use('/api/auth',         authRoutes)
app.use('/api/stock',        stockRoutes)
app.use('/api/bills',        billRoutes)
app.use('/api/dashboard',    dashboardRoutes)
app.use('/api/goldloan',     goldloanRoutes)
app.use('/api/weightcheck',  weightCheckRoutes)

app.get('/', (req, res) => {
  res.json({ message: '✅ Palivella Jewellery Backend Running!' })
})

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
})