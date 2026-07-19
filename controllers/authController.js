const crypto = require('crypto')
const User = require('../models/User')
const sendEmail = require('../utils/sendEmail')

// Helper: send token response
const sendToken = (user, statusCode, res) => {
  const token = user.getSignedJwtToken()
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  })
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email and password' })
  }

  const existing = await User.findOne({ email })
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already registered' })
  }

  const user = await User.create({ name, email, password, phone: phone || '' })
  sendToken(user, 201, res)
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email or phone and password' })
  }

  const user = await User.findOne({ 
    $or: [{ email: email.toLowerCase() }, { phone: email }] 
  }).select('+password')
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }

  if (user.isBanned) {
    return res.status(403).json({ success: false, message: 'Your account has been suspended' })
  }

  const isMatch = await user.matchPassword(password)
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }

  sendToken(user, 200, res)
}

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id)
  res.status(200).json({ success: true, user })
}

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone },
    { new: true, runValidators: true }
  )
  res.status(200).json({ success: true, user })
}

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findById(req.user.id).select('+password')

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' })
  }

  user.password = newPassword
  await user.save()

  sendToken(user, 200, res)
}

exports.forgotPassword = async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ success: false, message: 'Please provide an email' })
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return res.status(200).json({ success: true, message: 'If an account exists for that email, an OTP has been sent.' })
  
  const otp = user.getResetPasswordToken()
  await user.save({ validateBeforeSave: false })
  
  const message = `Your password reset OTP is: ${otp}\n\nIt is valid for 10 minutes.\nIf you did not request a password reset, please ignore this email.`
  
  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset OTP',
      message
    })
    res.status(200).json({ success: true, message: 'If an account exists for that email, an OTP has been sent.' })
  } catch (err) {
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save({ validateBeforeSave: false })
    return res.status(500).json({ success: false, message: 'Email could not be sent' })
  }
}

exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body
  if (!email || !otp || !password) return res.status(400).json({ success: false, message: 'Please provide email, OTP, and new password' })
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
  
  const hashedToken = crypto.createHash('sha256').update(otp).digest('hex')
  const user = await User.findOne({ 
    email: email.toLowerCase(),
    resetPasswordToken: hashedToken, 
    resetPasswordExpire: { $gt: Date.now() } 
  })
  
  if (!user) return res.status(400).json({ success: false, message: 'OTP is invalid or has expired' })
  
  user.password = password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()
  
  sendToken(user, 200, res)
}
