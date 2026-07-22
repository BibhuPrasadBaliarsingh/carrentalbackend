const mongoose = require('mongoose')

const DEFAULT_SETTINGS = {
  platformName: 'SpeedToyz Cars',
  supportEmail: 'support@speedtoyz.com',
  currency: 'INR (₹)',
  taxRate: 8,
  brands: ['Ferrari', 'Mercedes', 'Land Rover', 'Porsche', 'BMW', 'Tesla', 'Lamborghini', 'Audi', 'McLaren', 'Maruti'],
  categories: ['Sports', 'Luxury', 'SUV', 'Electric', 'Supercar', 'Hatchback', 'Sedan'],
}

const SettingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'SpeedToyz Cars' },
  supportEmail: { type: String, default: 'support@speedtoyz.com' },
  currency: { type: String, default: 'INR (₹)' },
  taxRate: { type: Number, default: 8 },
  brands: {
    type: [String],
    default: ['Ferrari', 'Mercedes', 'Land Rover', 'Porsche', 'BMW', 'Tesla', 'Lamborghini', 'Audi', 'McLaren', 'Maruti'],
  },
  categories: {
    type: [String],
    default: ['Sports', 'Luxury', 'SUV', 'Electric', 'Supercar', 'Hatchback', 'Sedan'],
  },
}, { timestamps: true })

SettingsSchema.statics.getSingleton = async function () {
  if (mongoose.connection.readyState !== 1) {
    return DEFAULT_SETTINGS
  }
  try {
    let settings = await this.findOne()
    if (!settings) settings = await this.create({})
    return settings
  } catch (err) {
    return DEFAULT_SETTINGS
  }
}

module.exports = mongoose.model('Settings', SettingsSchema)
