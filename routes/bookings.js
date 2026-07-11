const express = require('express')
const router = express.Router()
const {
  createBooking, getMyBookings, getAllBookings, cancelBooking, updateBookingStatus,
} = require('../controllers/bookingController')
const { protect, admin } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.post('/', protect, upload.fields([
  { name: 'dlDocument', maxCount: 1 },
  { name: 'aadhaarDocument', maxCount: 1 },
  { name: 'paymentScreenshot', maxCount: 1 }
]), createBooking)
router.get('/my', protect, getMyBookings)

// Admin only
router.get('/', protect, admin, getAllBookings)
router.put('/:id/cancel', protect, cancelBooking)
router.put('/:id/status', protect, admin, updateBookingStatus)

module.exports = router
