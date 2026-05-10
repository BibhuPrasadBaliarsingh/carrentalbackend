require('dotenv').config()
require('express-async-errors')

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')

const connectDB = require('./config/db')
const errorHandler = require('./middleware/errorHandler')

// Route files
const authRoutes = require('./routes/auth')
const carRoutes = require('./routes/cars')
const bookingRoutes = require('./routes/bookings')
const dashboardRoutes = require('./routes/dashboard')
const userRoutes = require('./routes/users')

// Connect to database
connectDB()

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// ── Static files (uploaded car images) ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/cars', carRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/users', userRoutes)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 SpeedToyz API is running',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler)

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  console.log(`\n🚀 SpeedToyz API running on port ${PORT} [${process.env.NODE_ENV}]`)
  console.log(`📍 http://localhost:${PORT}/api/health\n`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message)
  server.close(() => process.exit(1))
})
