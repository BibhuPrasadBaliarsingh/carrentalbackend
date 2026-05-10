const mongoose = require('mongoose')

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerDay: {
      type: Number,
      required: true,
    },
    insuranceFee: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],
      default: 'Confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Refunded'],
      default: 'Paid',
    },
    paymentMethod: {
      type: String,
      enum: ['Credit Card', 'PayPal', 'Bank Transfer'],
      default: 'Credit Card',
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
