const mongoose = require('mongoose')

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] },
  phone: { type: String, default: '' },
  subject: { type: String, default: 'General Enquiry' },
  message: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['New', 'Read', 'Resolved'], default: 'New' },
}, { timestamps: true })

module.exports = mongoose.model('Contact', ContactSchema)
