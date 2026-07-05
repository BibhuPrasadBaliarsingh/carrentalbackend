const Car = require('../models/Car')
const path = require('path')
const fs = require('fs')

// @desc    Get all cars (with filters, search, sort, pagination)
// @route   GET /api/cars
// @access  Public
exports.getCars = async (req, res) => {
  const {
    search, brand, category, fuelType, transmission,
    minPrice, maxPrice, available,
    sort = '-createdAt', page = 1, limit = 12,
  } = req.query

  const query = {}

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ]
  }

  if (brand) query.brand = { $regex: brand, $options: 'i' }
  if (category) query.category = category
  if (fuelType) query.fuelType = fuelType
  if (transmission) query.transmission = transmission
  if (available !== undefined) query.available = available === 'true'

  if (minPrice || maxPrice) {
    query.pricePerDay = {}
    if (minPrice) query.pricePerDay.$gte = Number(minPrice)
    if (maxPrice) query.pricePerDay.$lte = Number(maxPrice)
  }

  const skip = (Number(page) - 1) * Number(limit)
  const total = await Car.countDocuments(query)

  const cars = await Car.find(query)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    cars,
  })
}

// @desc    Get single car
// @route   GET /api/cars/:id
// @access  Public
exports.getCar = async (req, res) => {
  const car = await Car.findById(req.params.id)
  if (!car) {
    return res.status(404).json({ success: false, message: 'Car not found' })
  }
  res.status(200).json({ success: true, car })
}

// @desc    Create car
// @route   POST /api/cars
// @access  Admin
exports.createCar = async (req, res) => {
  const images = req.files ? req.files.map(f => f.filename) : []

  const car = await Car.create({ ...req.body, images })
  res.status(201).json({ success: true, car })
}

// @desc    Update car
// @route   PUT /api/cars/:id
// @access  Admin
exports.updateCar = async (req, res) => {
  let car = await Car.findById(req.params.id)
  if (!car) {
    return res.status(404).json({ success: false, message: 'Car not found' })
  }

  const updateData = { ...req.body }

  // If new images uploaded, replace the old ones
  // If no images uploaded, keep the existing ones
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(f => f.filename)
    updateData.images = newImages
  }

  car = await Car.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
  res.status(200).json({ success: true, car })
}

// @desc    Delete car
// @route   DELETE /api/cars/:id
// @access  Admin
exports.deleteCar = async (req, res) => {
  const car = await Car.findById(req.params.id)
  if (!car) {
    return res.status(404).json({ success: false, message: 'Car not found' })
  }

  // Delete associated image files
  car.images.forEach(img => {
    if (!img.startsWith('http')) {
      const filePath = path.join(__dirname, '../uploads', img)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
  })

  await car.deleteOne()
  res.status(200).json({ success: true, message: 'Car deleted successfully' })
}

// @desc    Toggle car availability
// @route   PUT /api/cars/:id/availability
// @access  Admin
exports.toggleAvailability = async (req, res) => {
  const car = await Car.findById(req.params.id)
  if (!car) {
    return res.status(404).json({ success: false, message: 'Car not found' })
  }
  car.available = !car.available
  await car.save()
  res.status(200).json({ success: true, car })
}
