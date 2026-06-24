const Booking = require('../models/Booking')
const Car = require('../models/Car')

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  const { carId, pickupDate, returnDate, pickupLocation, includesInsurance, paymentMethod } = req.body

  const car = await Car.findById(carId)
  if (!car) {
    return res.status(404).json({ success: false, message: 'Car not found' })
  }
  if (!car.available) {
    return res.status(400).json({ success: false, message: 'Car is not available' })
  }

  const pickup = new Date(pickupDate)
  const returnD = new Date(returnDate)

  if (returnD <= pickup) {
    return res.status(400).json({ success: false, message: 'Return date must be after pickup date' })
  }

  const totalDays = Math.ceil((returnD - pickup) / (1000 * 60 * 60 * 24))
  const insuranceFee = includesInsurance ? 50 * totalDays : 0
  const totalPrice = car.pricePerDay * totalDays + insuranceFee

  const booking = await Booking.create({
    user: req.user.id,
    car: carId,
    pickupDate: pickup,
    returnDate: returnD,
    pickupLocation,
    totalDays,
    pricePerDay: car.pricePerDay,
    insuranceFee,
    totalPrice,
    includesInsurance: !!includesInsurance,
    paymentMethod: paymentMethod || 'Credit Card',
    bookingStatus: 'Confirmed',
    paymentStatus: 'Paid',
  })

  const populated = await booking.populate([
    { path: 'car', select: 'name brand images pricePerDay category' },
    { path: 'user', select: 'name email' },
  ])

  res.status(201).json({ success: true, booking: populated })
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
    { new: true }
  ).populate('car user')

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' })
  }

  res.status(200).json({ success: true, booking })
}
