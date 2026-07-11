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

  const dbCars = await Car.find(query)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .lean()

  let externalCars = []
  try {
    const extRes = await fetch('https://velocity.quantumstudio.in/api/organizations/speed-toyz-cars/vehicles', {
      headers: { 'x-api-key': '2f87d2d7-ecdd-4389-b4ff-df9481a5fc8a' }
    });
    if (extRes.ok) {
      const data = await extRes.json();
      const extList = data.vehicles || data.data || data;
      
      if (Array.isArray(extList)) {
        externalCars = extList.map((car, idx) => {
          const dailySlab = car.pricingConfig?.slabs?.find(s => s.duration_hours === 24);
          const price = dailySlab ? dailySlab.price : (car.pricePerDay || 0);
          
          const rawFuel = car.catalogVariant?.fuelType || 'Petrol';
          const fuel = rawFuel.charAt(0).toUpperCase() + rawFuel.slice(1);
          const bodyType = car.catalogEntry?.body || 'Standard';

          return {
            _id: `ext-${car.id || idx}`, 
            isExternal: true,
            name: `${car.name || 'Unknown'} - ${car.licensePlate || 'No Plate'}`,
            brand: car.catalogEntry?.brand?.name || 'External',
            pricePerDay: price,
            fuelType: fuel,
            seats: car.catalogEntry?.seatingCapacity || 4,
            transmission: car.catalogVariant?.transmission || 'Automatic',
            description: `Variant: ${car.catalogVariant?.name || 'N/A'}`,
            images: car.primaryImage ? [`https://velocity.quantumstudio.in/${car.primaryImage}`] : [],
            category: bodyType.toUpperCase(),
            available: true,
            rating: 4.8
          };
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch external cars:', err.message);
  }

  const cars = [...dbCars, ...externalCars]

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
  const id = req.params.id;

  if (id.startsWith('ext-')) {
    const extId = id.slice(4);
    try {
      const extRes = await fetch('https://velocity.quantumstudio.in/api/organizations/speed-toyz-cars/vehicles', {
        headers: { 'x-api-key': '2f87d2d7-ecdd-4389-b4ff-df9481a5fc8a' }
      });
      if (extRes.ok) {
        const data = await extRes.json();
        const extList = data.vehicles || data.data || data;
        const rawCar = (Array.isArray(extList) ? extList : []).find(c => String(c.id) === extId || String(extList.indexOf(c)) === extId);
        
        if (rawCar) {
          const dailySlab = rawCar.pricingConfig?.slabs?.find(s => s.duration_hours === 24);
          const price = dailySlab ? dailySlab.price : (rawCar.pricePerDay || 0);
          
          const rawFuel = rawCar.catalogVariant?.fuelType || 'Petrol';
          const fuel = rawFuel.charAt(0).toUpperCase() + rawFuel.slice(1);
          const bodyType = rawCar.catalogEntry?.body || 'Standard';

          const mappedCar = {
            _id: id,
            isExternal: true,
            name: `${rawCar.name || 'Unknown'} - ${rawCar.licensePlate || 'No Plate'}`,
            brand: rawCar.catalogEntry?.brand?.name || 'External',
            pricePerDay: price,
            fuelType: fuel,
            seats: rawCar.catalogEntry?.seatingCapacity || 4,
            transmission: rawCar.catalogVariant?.transmission || 'Automatic',
            description: `Variant: ${rawCar.catalogVariant?.name || 'N/A'}`,
            images: rawCar.primaryImage ? [`https://velocity.quantumstudio.in/${rawCar.primaryImage}`] : [],
            category: bodyType.toUpperCase(),
            available: true,
            rating: 4.8
          };
          return res.status(200).json({ success: true, car: mappedCar });
        }
      }
    } catch (err) {
      console.error('Failed to fetch external car by ID:', err.message);
    }
    return res.status(404).json({ success: false, message: 'External car not found' });
  }

  const car = await Car.findById(id)
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
