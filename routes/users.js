const express = require('express')
const router = express.Router()
const { getUsers, getUser, toggleBan, deleteUser, updateRole } = require('../controllers/userController')
const { protect, admin } = require('../middleware/auth')

router.get('/', protect, admin, getUsers)
router.get('/:id', protect, admin, getUser)
router.put('/:id/ban', protect, admin, toggleBan)
router.put('/:id/role', protect, admin, updateRole)
router.delete('/:id', protect, admin, deleteUser)

module.exports = router
