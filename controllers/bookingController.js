const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Car = require('../models/Car')
const User = require('../models/User')
const Settings = require('../models/Settings')

// @desc    Create booking
// @route   POST /api/bookings
// @access  Public / Private
exports.createBooking = async (req, res) => {
  try {
    const { carId, carName, carBrand, carCategory, pricePerDay, carImage, carFuelType, carSeats, carTransmission, pickupDate, returnDate, pickupLocation, pickupDetails, googleMapsUrl, deliveryMode, includesInsurance, paymentMethod, drivingLicenseNumber, aadhaarNumber, address, firstName, lastName, email, phone } = req.body

    // Resolve the image: use carImage from payload if it's a real URL, else fallback
    const PLACEHOLDER = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'
    const resolvedImage = carImage && carImage.startsWith('http') && !carImage.includes('unsplash')
      ? carImage
      : (carImage && carImage.startsWith('http') ? carImage : PLACEHOLDER)

    let userId = req.user?.id || req.user?._id
    const userEmail = email ? email.trim().toLowerCase() : (req.user?.email ? req.user.email.trim().toLowerCase() : '')
    const userPhone = phone ? phone.trim() : (req.user?.phone ? req.user.phone.trim() : '')

    if (!userId && (userEmail || userPhone)) {
      let foundUser = await User.findOne({
        $or: [
          ...(userEmail ? [{ email: userEmail }] : []),
          ...(userPhone ? [{ phone: userPhone }] : []),
        ]
      })

      if (!foundUser && userEmail) {
        foundUser = await User.create({
          name: `${firstName || ''} ${lastName || ''}`.trim() || 'Guest Customer',
          email: userEmail,
          phone: userPhone || '',
          password: 'guestpassword123',
          role: 'user',
        })
      }
      if (foundUser) userId = foundUser._id
    }

    let car
    if (mongoose.isValidObjectId(carId)) {
      car = await Car.findById(carId)
    }

    if (!car && carName) {
      car = await Car.findOne({ name: carName })
    }

    if (!car) {
      // Auto-create car in MongoDB for external fleet vehicles
      car = await Car.create({
        name: carName || 'Luxury Rental Car',
        brand: carBrand || 'SpeedToyz',
        category: carCategory || 'Sports',
        pricePerDay: Number(pricePerDay) || 500,
        fuelType: carFuelType || 'Petrol',
        seats: Number(carSeats) || 5,
        transmission: carTransmission || 'Automatic',
        description: `${carName || 'Luxury Rental Car'} - Premium vehicle available for booking.`,
        images: [resolvedImage],
        available: true,
      })
    } else if (car.images?.length === 0 || (car.images?.[0] && car.images[0].includes('unsplash') && resolvedImage && !resolvedImage.includes('unsplash'))) {
      // Update car image if it currently has a placeholder and we now have the real image
      car.images = [resolvedImage]
      await car.save()
    }

    if (!car.available) {
      return res.status(400).json({ success: false, message: 'Car is not available for booking' })
    }

    const pickup = new Date(pickupDate)
    const returnD = new Date(returnDate)

    if (isNaN(pickup.getTime()) || isNaN(returnD.getTime()) || returnD <= pickup) {
      return res.status(400).json({ success: false, message: 'Return date must be after pickup date' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (pickup < today) {
      return res.status(400).json({ success: false, message: 'Pickup date cannot be in the past' })
    }

    const isInsurance = includesInsurance === true || includesInsurance === 'true'
    const totalDays = Math.max(1, Math.ceil((returnD - pickup) / (1000 * 60 * 60 * 24)))
    const insuranceFee = isInsurance ? 50 * totalDays : 0
    let deliveryFee = 0
    if (deliveryMode === 'Doorstep') {
      deliveryFee = 250
    } else if (deliveryMode === 'Airport') {
      deliveryFee = 250
    }
    const settings = await Settings.getSingleton()
    const taxRate = Number(settings.taxRate ?? 0) / 100
    const subtotal = car.pricePerDay * totalDays + insuranceFee + deliveryFee
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
      user: userId,
      car: car._id,
      email: userEmail,
      phone: userPhone,
      pickupDate: pickup,
      returnDate: returnD,
      pickupLocation: pickupLocation || 'Main Office',
      pickupDetails: pickupDetails || '',
      googleMapsUrl: googleMapsUrl || '',
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
      deliveryFee,
      taxAmount,
      totalPrice,
      includesInsurance: isInsurance,
      paymentMethod: paymentMethod || 'Bank Transfer',
      bookingStatus: 'Pending',
      paymentStatus: 'Pending',
    })

    const populated = await booking.populate([
      { path: 'car', select: 'name brand images pricePerDay category' },
      { path: 'user', select: 'name email' },
    ])

    res.status(201).json({ success: true, booking: populated, taxAmount, taxRate })
  } catch (err) {
    console.error('Create booking error:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to create booking' })
  }
}

// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id
    const userEmail = req.user.email ? req.user.email.trim().toLowerCase() : ''
    const userPhone = req.user.phone ? req.user.phone.trim() : ''

    const bookings = await Booking.find({
      $or: [
        { user: userId },
        ...(userEmail ? [{ email: userEmail }, { customerEmail: userEmail }] : []),
        ...(userPhone ? [{ phone: userPhone }, { customerPhone: userPhone }] : []),
      ],
    })
      .populate('car', 'name brand images pricePerDay category fuelType seats transmission')
      .sort('-createdAt')

    res.status(200).json({ success: true, bookings })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Error fetching bookings' })
  }
}

// @desc    Get all bookings (admin)
// @route   GET /api/bookings
// @access  Admin
exports.getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 500 } = req.query
    const query = status ? { bookingStatus: status } : {}

    const total = await Booking.countDocuments(query)
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 500), 500)
    const bookings = await Booking.find(query)
      .populate('car', 'name brand images pricePerDay category')
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .skip((Number(page) - 1) * safeLimit)
      .limit(safeLimit)
      .lean()

    res.status(200).json({ success: true, total, bookings })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Error fetching bookings' })
  }
}

// Helper: find booking by ObjectId or bookingRef
const findBookingByIdOrRef = async (id) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(id)
  return await Booking.findOne({
    $or: [
      ...(isObjectId ? [{ _id: id }] : []),
      { bookingRef: id },
    ],
  })
}

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const id = req.params.id
    const booking = await findBookingByIdOrRef(id)

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    // Owners or admins can cancel
    const bookingUserId = booking.user ? (booking.user._id || booking.user).toString() : null
    const reqUserId = req.user ? (req.user._id || req.user.id || '').toString() : null
    const isAdmin = req.user && req.user.role === 'admin'

    if (bookingUserId && reqUserId && bookingUserId !== reqUserId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' })
    }

    if (booking.bookingStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' })
    }

    if (booking.bookingStatus === 'Completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed booking' })
    }

    booking.bookingStatus = 'Cancelled'
    booking.paymentStatus = 'Refunded'
    booking.cancellationReason = req.body.reason || 'Cancelled'
    await booking.save()

    res.status(200).json({ success: true, booking })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Error cancelling booking' })
  }
}

// @desc    Update booking status (admin)
// @route   PUT /api/bookings/:id/status
// @access  Admin
exports.updateBookingStatus = async (req, res) => {
  try {
    const id = req.params.id
    const { status } = req.body

    const booking = await findBookingByIdOrRef(id)

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    booking.bookingStatus = status
    if (status === 'Cancelled') booking.paymentStatus = 'Refunded'
    await booking.save()
    await booking.populate('car user')

    res.status(200).json({ success: true, booking })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Error updating booking status' })
  }
}
