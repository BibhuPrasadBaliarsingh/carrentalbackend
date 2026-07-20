const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Car = require('../models/Car')
const Settings = require('../models/Settings')

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  const { carId, carName, carBrand, carCategory, pricePerDay, pickupDate, returnDate, pickupLocation, deliveryMode, includesInsurance, paymentMethod, drivingLicenseNumber, aadhaarNumber, address } = req.body

  let car
  if (mongoose.isValidObjectId(carId)) {
    car = await Car.findById(carId)
  }

  if (!car && carName) {
    car = await Car.findOne({ name: carName })
  }

  if (!car) {
    // Automatically seed/create car in MongoDB if missing or using mock car
    car = await Car.create({
      name: carName || 'Luxury Rental Car',
      brand: carBrand || 'SpeedToyz',
      category: carCategory || 'Sports',
      pricePerDay: Number(pricePerDay) || 500,
      images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'],
      available: true,
    })
  }

  if (!car.available) {
    return res.status(400).json({ success: false, message: 'Car is not available' })
  }

  const pickup = new Date(pickupDate)
  const returnD = new Date(returnDate)

  if (isNaN(pickup.getTime()) || isNaN(returnD.getTime()) || returnD <= pickup) {
    return res.status(400).json({ success: false, message: 'Return date must be after pickup date' })
  }

  const isInsurance = includesInsurance === true || includesInsurance === 'true'
  const totalDays = Math.max(1, Math.ceil((returnD - pickup) / (1000 * 60 * 60 * 24)))
  const insuranceFee = isInsurance ? 50 * totalDays : 0
  const settings = await Settings.getSingleton()
  const taxRate = Number(settings.taxRate || 8) / 100
  const subtotal = car.pricePerDay * totalDays + insuranceFee
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100
  const totalPrice = subtotal + taxAmount

  const overlappingBooking = await Booking.findOne({
    car: car._id,
    bookingStatus: { $nin: ['Cancelled'] },
    pickupDate: { $lt: returnD },
    returnDate: { $gt: pickup },
  })

  if (overlappingBooking) {
    return res.status(400).json({ success: false, message: 'This car is already booked for the selected dates.' })
  }

  const booking = await Booking.create({
    user: req.user.id,
    car: car._id,
    pickupDate: pickup,
    returnDate: returnD,
    pickupLocation: pickupLocation || 'Main Office',
    deliveryMode: deliveryMode || 'Parking',
    drivingLicenseNumber: drivingLicenseNumber || '',
    aadhaarNumber: aadhaarNumber || '',
    address: address || '',
    dlDocument: req.files?.dlDocument?.[0]?.filename || '',
    aadhaarDocument: req.files?.aadhaarDocument?.[0]?.filename || '',
    paymentScreenshot: req.files?.paymentScreenshot?.[0]?.filename || '',
    totalDays,
    pricePerDay: car.pricePerDay,
    insuranceFee,
    taxAmount,
    totalPrice,
    includesInsurance: isInsurance,
    paymentMethod: paymentMethod || 'Bank Transfer',
    bookingStatus: 'Confirmed',
    paymentStatus: 'Paid',
  })

  const populated = await booking.populate([
    { path: 'car', select: 'name brand images pricePerDay category' },
    { path: 'user', select: 'name email' },
  ])

  res.status(201).json({ success: true, booking: populated, taxAmount, taxRate })
}

// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
exports.getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate('car', 'name brand images pricePerDay category fuelType seats transmission')
    .sort('-createdAt')

  res.status(200).json({ success: true, bookings })
}

// @desc    Get all bookings (admin)
// @route   GET /api/bookings
// @access  Admin
exports.getAllBookings = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const query = status ? { bookingStatus: status } : {}

  const total = await Booking.countDocuments(query)
  const bookings = await Booking.find(query)
    .populate('car', 'name brand images pricePerDay category')
    .populate('user', 'name email phone')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit))

  res.status(200).json({ success: true, total, bookings })
}

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id)

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' })
  }

  // Owners or admins can cancel
  if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized' })
  }

  if (booking.bookingStatus === 'Cancelled') {
    return res.status(400).json({ success: false, message: 'Booking already cancelled' })
  }

  if (booking.bookingStatus === 'Completed') {
    return res.status(400).json({ success: false, message: 'Cannot cancel a completed booking' })
  }

  booking.bookingStatus = 'Cancelled'
  booking.paymentStatus = 'Refunded'
  booking.cancellationReason = req.body.reason || 'Cancelled by user'
  await booking.save()

  res.status(200).json({ success: true, booking })
}

// @desc    Update booking status (admin)
// @route   PUT /api/bookings/:id/status
// @access  Admin
exports.updateBookingStatus = async (req, res) => {
  const { status } = req.body
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { bookingStatus: status },
    { new: true, runValidators: true }
  ).populate('car user')

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' })
  }

  res.status(200).json({ success: true, booking })
}
