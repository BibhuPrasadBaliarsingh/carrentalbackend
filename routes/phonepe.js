const express = require('express')
const router = express.Router()
const {
  initiatePayment,
  handleWebhook,
  checkPaymentStatus,
  verifyPayment,
} = require('../controllers/phonepeController')

router.post('/initiate', initiatePayment)
router.post('/webhook', handleWebhook)
router.get('/status/:merchantTransactionId', checkPaymentStatus)
router.post('/verify', verifyPayment)

module.exports = router
