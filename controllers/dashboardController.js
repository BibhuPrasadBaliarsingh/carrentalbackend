const mongoose = require('mongoose')
const User = require('../models/User')
const Car = require('../models/Car')
const Booking = require('../models/Booking')

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Admin
exports.getStats = async (req, res) => {
  let externalCount = 0
  try {
    const extRes = await fetch('https://velocity.quantumstudio.in/api/organizations/speed-toyz-cars/vehicles', {
      headers: { 'x-api-key': '2f87d2d7-ecdd-4389-b4ff-df9481a5fc8a' }
    });
    if (extRes.ok) {
      const data = await extRes.json();
      const list = data.vehicles || data.data || data;
      if (Array.isArray(list)) externalCount = list.length
    }
  } catch { }

  let totalUsers = 0
  let dbCarsCount = 0
  let totalBookings = 0
  let bookings = []
  let dbActive = 0

  if (mongoose.connection.readyState === 1) {
    try {
      const resArr = await Promise.all([
        User.countDocuments({ role: 'user' }),
        Car.countDocuments(),
        Booking.countDocuments(),
        Booking.find({ bookingStatus: { $ne: 'Cancelled' } }),
      ])
      totalUsers = resArr[0]
      dbCarsCount = resArr[1]
      totalBookings = resArr[2]
      bookings = resArr[3]
      dbActive = await Car.countDocuments({ available: true })
    } catch (err) {
      console.warn('Dashboard DB query skipped:', err.message)
    }
  }

  const totalCars = dbCarsCount + externalCount
  const revenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
  const activeCars = dbActive + externalCount

  // Revenue by month (last 7 months)
  const now = new Date()
  const revenueByMonth = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthBookings = bookings.filter(b => b.createdAt >= d && b.createdAt < end)
    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0)
    revenueByMonth.push({
      month: d.toLocaleString('default', { month: 'short' }),
      revenue: monthRevenue,
    })
  }

  // Fleet distribution
  const categories = await Car.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])

  // Recent bookings
  const recentBookings = await Booking.find()
    .populate('car', 'name brand images')
    .populate('user', 'name email')
    .sort('-createdAt')
    .limit(8)

  // Booking trends (last 7 days)
  const bookingTrends = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setHours(23, 59, 59, 999)
    const count = await Booking.countDocuments({ createdAt: { $gte: d, $lte: end } })
    bookingTrends.push({ day: d.toLocaleString('default', { weekday: 'short' }), bookings: count })
  }

  res.status(200).json({
    success: true,
    stats: {
      revenue,
      totalBookings,
      activeCars,
      totalUsers,
      revenueByMonth,
      fleetDistribution: categories.map(c => ({ category: c._id, count: c.count })),
      recentBookings,
      bookingTrends,
    },
  })
}
