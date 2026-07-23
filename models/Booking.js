const mongoose = require('mongoose')

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: true,
    },
    pickupDate: {
      type: Date,
      required: [true, 'Please provide a pickup date'],
    },
    returnDate: {
      type: Date,
      required: [true, 'Please provide a return date'],
    },
    pickupLocation: {
      type: String,
      required: [true, 'Please provide a pickup location'],
    },
    pickupDetails: { type: String, default: '' },
    googleMapsUrl: { type: String, default: '' },
    drivingLicenseNumber: { type: String, default: '' },
    aadhaarNumber: { type: String, default: '' },
    address: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    dlDocument: { type: String, default: '' },
    aadhaarDocument: { type: String, default: '' },
    paymentScreenshot: { type: String, default: '' },
    deliveryMode: {
      type: String,
      enum: ['Parking', 'Doorstep', 'Airport'],
      default: 'Parking',
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerDay: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
    insuranceFee: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    bookingAdvance: {
      type: Number,
      default: 500,
    },
    advancePaid: {
      type: Number,
      default: 500,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Credit Card', 'PayPal', 'Bank Transfer', 'PhonePe Gateway', 'PhonePe QR', 'PhonePe UPI'],
      default: 'PhonePe QR',
    },
    merchantTransactionId: {
      type: String,
      default: '',
    },
    phonepeTransactionId: {
      type: String,
      default: '',
    },
    paymentDetails: {
      type: Object,
      default: {},
    },
    includesInsurance: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

// Virtual: booking reference ID
BookingSchema.virtual('bookingRef').get(function () {
  return `BK${this._id.toString().slice(-6).toUpperCase()}`
})

BookingSchema.set('toJSON', { virtuals: true })
BookingSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Booking', BookingSchema)
