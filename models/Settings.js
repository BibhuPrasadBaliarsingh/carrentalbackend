const mongoose = require('mongoose')

const SettingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'SpeedToyz' },
  supportEmail: { type: String, default: 'support@speedtoyz.com' },
  currency: { type: String, default: 'INR (₹)' },
  taxRate: { type: Number, default: 8 },
}, { timestamps: true })

SettingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne()
  if (!settings) settings = await this.create({})
  return settings
}

module.exports = mongoose.model('Settings', SettingsSchema)
