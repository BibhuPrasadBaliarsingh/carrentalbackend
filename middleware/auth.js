const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Protect routes — verify JWT
exports.protect = async (req, res, next) => {
  let token

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' })
  }
}

// Admin only
exports.admin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  next()
}
