const User = require('../models/User')
const Booking = require('../models/Booking')

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
exports.getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 500 } = req.query
    const query = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }
    if (role) query.role = role

    const total = await User.countDocuments(query)
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 500), 500)
    const users = await User.find(query)
      .sort('-createdAt')
      .skip((Number(page) - 1) * safeLimit)
      .limit(safeLimit)
      .lean()

    res.status(200).json({ success: true, total, users })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Error fetching users' })
  }
}

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Admin
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })

  const bookings = await Booking.find({ user: req.params.id })
    .populate('car', 'name brand images')
    .sort('-createdAt')
    .limit(10)

  res.status(200).json({ success: true, user, bookings })
}

// @desc    Toggle user ban
// @route   PUT /api/users/:id/ban
// @access  Admin
exports.toggleBan = async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot ban an admin' })

  user.isBanned = !user.isBanned
  await user.save()

  res.status(200).json({ success: true, user, message: user.isBanned ? 'User banned' : 'User unbanned' })
}

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete an admin' })

  await user.deleteOne()
  res.status(200).json({ success: true, message: 'User deleted' })
}

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Admin
exports.updateRole = async (req, res) => {
  const { role } = req.body
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' })
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true })
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  res.status(200).json({ success: true, user })
}
