const crypto = require('crypto')
const User = require('../models/User')

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
    return res.status(400).json({ success: false, message: 'Please provide email and password' })
  }

  const user = await User.findOne({ email }).select('+password')
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
  const user = await User.findOne({ email })
  if (!user) return res.status(200).json({ success: true, message: 'If an account exists for that email, a reset link has been generated.' })
  const resetToken = user.getResetPasswordToken()
  await user.save({ validateBeforeSave: false })
  res.status(200).json({ success: true, message: 'If an account exists for that email, a reset link has been generated.', resetToken })
}

exports.resetPassword = async (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
  const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpire: { $gt: Date.now() } })
  if (!user) return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' })
  user.password = password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()
  sendToken(user, 200, res)
}
