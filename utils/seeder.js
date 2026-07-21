require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const connectDB = require('../config/db')
const User = require('../models/User')
const Car = require('../models/Car')
const Booking = require('../models/Booking')

const cars = [
  {
    name: 'Ferrari F8 Tributo', brand: 'Ferrari', category: 'Sports',
    pricePerDay: 899, fuelType: 'Petrol', seats: 2, transmission: 'Automatic',
    rating: 4.9, available: true,
    images: ['https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&q=80'],
    description: 'The Ferrari F8 Tributo features a twin-turbocharged 3.9-litre V8 producing 720hp. Mid-engine layout, 0-100 km/h in 2.9 seconds. The pinnacle of Ferrari V8 engineering.',
    features: ['GPS Navigation', 'Carbon Ceramic Brakes', 'Race Mode', 'Launch Control'],
    year: 2023,
  },
  {
    name: 'Mercedes S-Class', brand: 'Mercedes', category: 'Luxury',
    pricePerDay: 499, fuelType: 'Hybrid', seats: 5, transmission: 'Automatic',
    rating: 4.8, available: true,
    images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80'],
    description: 'The Mercedes-Benz S-Class flagship saloon with Burmester 4D surround sound, MBUX Hyperscreen, and magic body-control suspension.',
    features: ['Burmester Audio', 'MBUX Hyperscreen', 'Massage Seats', 'Active Suspension'],
    year: 2024,
  },
  {
    name: 'Range Rover Sport', brand: 'Land Rover', category: 'SUV',
    pricePerDay: 399, fuelType: 'Hybrid', seats: 5, transmission: 'Automatic',
    rating: 4.7, available: true,
    images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80'],
    description: 'Range Rover Sport combines legendary off-road capability with boulevard refinement. Plug-in hybrid powertrain, configurable terrain response, and dynamic driving modes.',
    features: ['Terrain Response 2', 'Pivi Pro Infotainment', 'Air Suspension', 'Wade Sensing'],
    year: 2024,
  },
  {
    name: 'Porsche 911 Carrera S', brand: 'Porsche', category: 'Sports',
    pricePerDay: 799, fuelType: 'Petrol', seats: 2, transmission: 'Automatic',
    rating: 4.9, available: true,
    images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'],
    description: 'The Porsche 911 Carrera S — 450hp flat-six, rear-wheel steering, PASM active suspension, and Sport Chrono Package. Iconic rear-engine layout, timeless design.',
    features: ['Sport Chrono Package', 'PASM Suspension', 'Rear Steering', 'Bose Surround Sound'],
    year: 2023,
  },
  {
    name: 'BMW M3 Competition', brand: 'BMW', category: 'Sports',
    pricePerDay: 549, fuelType: 'Petrol', seats: 4, transmission: 'Automatic',
    rating: 4.8, available: true,
    images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80'],
    description: 'The BMW M3 Competition with 503hp inline-six twin-turbo, M xDrive all-wheel drive, and M-specific chassis with adaptive M suspension.',
    features: ['M xDrive AWD', 'M Carbon Seats', 'Adaptive M Suspension', 'M Track Mode'],
    year: 2024,
  },
  {
    name: 'Tesla Model S Plaid', brand: 'Tesla', category: 'Electric',
    pricePerDay: 349, fuelType: 'Electric', seats: 5, transmission: 'Automatic',
    rating: 4.7, available: true,
    images: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80'],
    description: 'Tesla Model S Plaid — 0-60 mph in under 2 seconds, 396-mile range, tri-motor all-wheel drive. Autopilot included. The fastest production car ever built.',
    features: ['Autopilot', 'Tri-Motor AWD', '17" Touchscreen', 'Over-the-Air Updates'],
    year: 2024,
  },
  {
    name: 'Lamborghini Huracán', brand: 'Lamborghini', category: 'Supercar',
    pricePerDay: 1299, fuelType: 'Petrol', seats: 2, transmission: 'Automatic',
    rating: 5.0, available: true,
    images: ['https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80'],
    description: 'Lamborghini Huracán Performante — 640hp naturally aspirated V10, active aerodynamics, carbon fibre bodywork, and ALA (Aerodinamica Lamborghini Attiva) system.',
    features: ['Active Aerodynamics', 'V10 Naturally Aspirated', 'Carbon Fiber Body', 'Forged Composite'],
    year: 2023,
  },
  {
    name: 'Audi RS6 Avant', brand: 'Audi', category: 'Luxury',
    pricePerDay: 449, fuelType: 'Petrol', seats: 5, transmission: 'Automatic',
    rating: 4.8, available: true,
    images: ['https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800&q=80'],
    description: 'Audi RS6 Avant — 600hp twin-turbo V8 mild-hybrid, quattro AWD, adaptive air suspension. The ultimate performance estate combining practicality with supercar performance.',
    features: ['Quattro AWD', 'Air Suspension', 'Bang & Olufsen Audio', 'Night Vision'],
    year: 2024,
  },
  {
    name: 'McLaren 720S', brand: 'McLaren', category: 'Supercar',
    pricePerDay: 1199, fuelType: 'Petrol', seats: 2, transmission: 'Automatic',
    rating: 4.9, available: true,
    images: ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80'],
    description: 'McLaren 720S — 4.0-litre twin-turbo V8 producing 720hp. Carbon fibre monocoque chassis, proactive chassis control, and variable drift control for extraordinary agility.',
    features: ['Proactive Chassis Control', 'Carbon Monocoque', 'Variable Drift Control', 'Track Telemetry'],
    year: 2023,
  },
]

const seed = async () => {
  await connectDB()

  console.log('🗑  Clearing car and booking seed data...')
  await Promise.all([Car.deleteMany(), Booking.deleteMany()])

  console.log('👤 Ensuring default admin and sample users exist...')
  const existingAdmin = await User.findOne({ email: 'admin@speedtoyz.com' })
  if (!existingAdmin) {
    await User.create({
      name: 'Admin User',
      email: 'admin@speedtoyz.com',
      password: 'Admin@123',
      role: 'admin',
    })
  }

  const existingJohn = await User.findOne({ email: 'john@example.com' })
  if (!existingJohn) {
    await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'User@123',
      role: 'user',
      phone: '+1 555-123-4567',
    })
  }

  console.log('🚗 Seeding cars...')
  const createdCars = await Car.insertMany(cars)

  console.log('\n✅ Seed complete!')
  console.log('─────────────────────────────────')
  console.log(`Admin: admin@speedtoyz.com / Admin@123`)
  console.log(`User:  john@example.com / User@123`)
  console.log('─────────────────────────────────\n')
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
