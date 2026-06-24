const mongoose = require('mongoose')

const SubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] },
}, { timestamps: true })

module.exports = mongoose.model('Subscriber', SubscriberSchema)
