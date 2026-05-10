const mongoose = require('mongoose')

const CarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a car name'],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Please provide a brand'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      enum: ['Sports', 'Luxury', 'SUV', 'Electric', 'Supercar', 'Convertible', 'Sedan'],
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Please provide a price per day'],
      min: [1, 'Price must be positive'],
    },
    fuelType: {
      type: String,
      required: [true, 'Please provide fuel type'],
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    },
    seats: {
      type: Number,
      required: [true, 'Please provide number of seats'],
      min: 1,
      max: 12,
    },
    transmission: {
      type: String,
      required: [true, 'Please provide transmission type'],
      enum: ['Automatic', 'Manual'],
      default: 'Automatic',
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    images: {
      type: [String],
      default: [],
    },
    available: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    features: {
      type: [String],
      default: ['GPS Navigation', 'Bluetooth', 'Air Conditioning', 'USB Charging'],
    },
    location: {
      type: String,
      default: 'Miami, FL',
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    mileage: {
      type: String,
      default: 'Unlimited',
    },
  },
  { timestamps: true }
)

// Text index for search
CarSchema.index({ name: 'text', brand: 'text', description: 'text' })

module.exports = mongoose.model('Car', CarSchema)
