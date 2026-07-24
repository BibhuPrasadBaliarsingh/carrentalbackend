const mongoose = require('mongoose')
const Car = require('../models/Car')
const Booking = require('../models/Booking')
const path = require('path')
const fs = require('fs')

// @desc    Get all cars (with filters, search, sort, pagination)
// @route   GET /api/cars
// @access  Public
exports.getCars = async (req, res) => {
  const {
    search, brand, category, fuelType, transmission,
    minPrice, maxPrice, available, pickupDate, returnDate,
    sort = '-createdAt', page = 1, limit = 500,
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

  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 500), 500)
  const skip = (Number(page) - 1) * safeLimit

  let dbCars = []
  let total = 0

  if (mongoose.connection.readyState === 1) {
    try {
      if (pickupDate && returnDate) {
        const pickup = new Date(pickupDate);
        const returnD = new Date(returnDate);

        const overlappingBookings = await Booking.find({
          bookingStatus: { $nin: ['Cancelled'] },
          pickupDate: { $lt: returnD },
          returnDate: { $gt: pickup }
        }).select('car');

        const bookedCarIds = overlappingBookings.map(b => b.car);
        if (bookedCarIds.length > 0) {
          query._id = { $nin: bookedCarIds };
        }
      }

      total = await Car.countDocuments(query)
      dbCars = await Car.find(query)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .lean()
    } catch (err) {
      console.warn('Database query skipped (DB offline):', err.message)
    }
  }

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
          const price = (dailySlab && dailySlab.price > 0) ? dailySlab.price : (car.pricePerDay || 500);

          const rawFuel = car.catalogVariant?.fuelType || 'Petrol';
          const fuel = rawFuel.charAt(0).toUpperCase() + rawFuel.slice(1);
          const bodyType = (car.catalogEntry?.body && car.catalogEntry.body.toUpperCase() !== 'STANDARD') ? car.catalogEntry.body : 'Sedan';
          const cat = bodyType.toUpperCase() === 'STANDARD' ? 'SEDAN' : bodyType.toUpperCase();

          const brandName = car.catalogEntry?.brand?.name || 'car';
          const modelName = car.catalogEntry?.model || (car.name ? car.name.replace(brandName, '').trim() : 'car');
          const fallbackImage = `https://cdn.imagin.studio/getimage?customer=hrjavascript-mastery&make=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&paintId=pspc0001&angle=23&width=800&zoomType=fullscreen`;

          const resolveTransmission = (c) => {
            const rawTrans = c.catalogVariant?.transmission;
            if (rawTrans && typeof rawTrans === 'string' && rawTrans.trim()) {
              return rawTrans.charAt(0).toUpperCase() + rawTrans.slice(1).toLowerCase();
            }
            const text = `${c.name || ''} ${c.variant || ''} ${c.catalogVariant?.name || ''}`.toUpperCase();
            if (/\b(AT|AUTOMATIC|AMT|CVT|DCT|DSG)\b/.test(text) || text.includes(' AUTOMATIC ') || text.includes(' AT ')) {
              return 'Automatic';
            }
            return 'Manual';
          };

          return {
            _id: `ext-${car.id || idx}`,
            isExternal: true,
            name: car.name ? car.name.split(' - ')[0].trim() : 'Unknown',
            brand: car.catalogEntry?.brand?.name || 'External',
            pricePerDay: price,
            fuelType: fuel,
            seats: car.catalogEntry?.seatingCapacity || 4,
            transmission: resolveTransmission(car),
            description: `Variant: ${car.catalogVariant?.name || 'N/A'}`,
            images: car.primaryImage ? [`https://cdn.quantumstudio.in/vehicles/${car.primaryImage}`] : [fallbackImage],
            fallbackImage,
            category: cat,
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
  const combinedTotal = total + externalCars.length

  res.status(200).json({
    success: true,
    total: combinedTotal,
    page: Number(page),
    pages: Math.ceil(combinedTotal / Number(limit)) || 1,
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
          const bodyType = (rawCar.catalogEntry?.body && rawCar.catalogEntry.body.toUpperCase() !== 'STANDARD') ? rawCar.catalogEntry.body : 'Sedan';
          const cat = bodyType.toUpperCase() === 'STANDARD' ? 'SEDAN' : bodyType.toUpperCase();

          const brandName = rawCar.catalogEntry?.brand?.name || 'car';
          const modelName = rawCar.catalogEntry?.model || (rawCar.name ? rawCar.name.replace(brandName, '').trim() : 'car');
          const fallbackImage = `https://cdn.imagin.studio/getimage?customer=hrjavascript-mastery&make=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&paintId=pspc0001&angle=23&width=800&zoomType=fullscreen`;

          const resolveTransmission = (c) => {
            const rawTrans = c.catalogVariant?.transmission;
            if (rawTrans && typeof rawTrans === 'string' && rawTrans.trim()) {
              return rawTrans.charAt(0).toUpperCase() + rawTrans.slice(1).toLowerCase();
            }
            const text = `${c.name || ''} ${c.variant || ''} ${c.catalogVariant?.name || ''}`.toUpperCase();
            if (/\b(AT|AUTOMATIC|AMT|CVT|DCT|DSG)\b/.test(text) || text.includes(' AUTOMATIC ') || text.includes(' AT ')) {
              return 'Automatic';
            }
            return 'Manual';
          };

          const mappedCar = {
            _id: id,
            isExternal: true,
            name: rawCar.name ? rawCar.name.split(' - ')[0].trim() : 'Unknown',
            brand: rawCar.catalogEntry?.brand?.name || 'External',
            pricePerDay: price,
            fuelType: fuel,
            seats: rawCar.catalogEntry?.seatingCapacity || 4,
            transmission: resolveTransmission(rawCar),
            description: `Variant: ${rawCar.catalogVariant?.name || 'N/A'}`,
            images: rawCar.primaryImage ? [`https://cdn.quantumstudio.in/vehicles/${rawCar.primaryImage}`] : [fallbackImage],
            fallbackImage,
            category: cat,
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

  if (mongoose.connection.readyState === 1) {
    try {
      const car = await Car.findById(id)
      if (car) return res.status(200).json({ success: true, car })
    } catch (err) {
      console.warn('Database findById failed (DB offline):', err.message)
    }
  }

  return res.status(404).json({ success: false, message: 'Car not found' })
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
