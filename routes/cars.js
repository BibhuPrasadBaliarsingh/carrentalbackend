const express = require('express')
const router = express.Router()
const {
  getCars, getCar, createCar, updateCar, deleteCar, toggleAvailability,
} = require('../controllers/carController')
const { protect, admin } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.get('/', getCars)
router.get('/:id', getCar)

// Admin only
router.post('/', protect, admin, upload.array('images', 10), createCar)
router.put('/:id', protect, admin, upload.array('images', 10), updateCar)
router.delete('/:id', protect, admin, deleteCar)
router.put('/:id/availability', protect, admin, toggleAvailability)

module.exports = router
