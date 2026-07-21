const Contact = require('../models/Contact')
const Subscriber = require('../models/Subscriber')
const Settings = require('../models/Settings')

exports.createContact = async (req, res) => {
  const { name, email, phone, subject, message } = req.body
  if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Please provide name, email and message' })
  const contact = await Contact.create({ name, email, phone, subject, message })
  res.status(201).json({ success: true, message: "Thanks for reaching out! We'll get back to you shortly.", contact })
}

exports.getContacts = async (req, res) => {
  const contacts = await Contact.find().sort('-createdAt')
  res.status(200).json({ success: true, total: contacts.length, contacts })
}

exports.subscribe = async (req, res) => {
  const { email } = req.body
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: 'Please provide a valid email' })
  const existing = await Subscriber.findOne({ email: email.toLowerCase() })
  if (existing) return res.status(200).json({ success: true, message: "You're already subscribed!" })
  await Subscriber.create({ email })
  res.status(201).json({ success: true, message: 'Subscribed successfully! 🎉' })
}

exports.getSettings = async (req, res) => {
  const settings = await Settings.getSingleton()
  res.status(200).json({ success: true, settings })
}

exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton()
    res.status(200).json({
      success: true,
      settings: {
        platformName: settings?.platformName || 'SpeedToyz Cars',
        supportEmail: settings?.supportEmail || 'support@speedtoyz.com',
        currency: settings?.currency || 'INR (₹)',
        taxRate: settings?.taxRate || 8,
      },
    })
  } catch (err) {
    res.status(200).json({
      success: true,
      settings: {
        platformName: 'SpeedToyz Cars',
        supportEmail: 'support@speedtoyz.com',
        currency: 'INR (₹)',
        taxRate: 8,
      },
    })
  }
}

exports.getFilterOptions = async (req, res) => {
  try {
    const settings = await Settings.getSingleton()
    res.status(200).json({
      success: true,
      brands: settings?.brands || [],
      categories: settings?.categories || [],
    })
  } catch (err) {
    res.status(200).json({
      success: true,
      brands: ['Ferrari', 'Mercedes', 'Land Rover', 'Porsche', 'BMW', 'Tesla', 'Lamborghini', 'Audi', 'McLaren'],
      categories: ['Sports', 'Luxury', 'SUV', 'Electric', 'Supercar'],
    })
  }
}

exports.updateSettings = async (req, res) => {
  const { platformName, supportEmail, currency, taxRate, brands, categories } = req.body
  const settings = await Settings.getSingleton()
  if (platformName !== undefined) settings.platformName = platformName
  if (supportEmail !== undefined) settings.supportEmail = supportEmail
  if (currency !== undefined) settings.currency = currency
  if (taxRate !== undefined) settings.taxRate = taxRate
  if (brands !== undefined && Array.isArray(brands)) settings.brands = brands.filter(Boolean)
  if (categories !== undefined && Array.isArray(categories)) settings.categories = categories.filter(Boolean)
  await settings.save()
  res.status(200).json({ success: true, settings })
}
