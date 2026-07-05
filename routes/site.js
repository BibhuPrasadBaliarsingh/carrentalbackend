const express = require('express')
const router = express.Router()
const { createContact, getContacts, subscribe, getSettings, getPublicSettings, updateSettings, getFilterOptions } = require('../controllers/siteController')
const { protect, admin } = require('../middleware/auth')

router.post('/contact', createContact)
router.get('/contact', protect, admin, getContacts)
router.post('/newsletter', subscribe)
router.get('/filters', getFilterOptions)
router.get('/settings', protect, admin, getSettings)
router.get('/settings/public', getPublicSettings)
router.put('/settings', protect, admin, updateSettings)

module.exports = router
