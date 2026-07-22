const mongoose = require('mongoose')

// Globally disable query buffering so endpoints respond instantly (0ms delay) when DB is offline
mongoose.set('bufferCommands', false)

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb+srv://bibhu2022_db_user:bibhu%40123@cluster0.jtfw9v8.mongodb.net/speedtoyz?retryWrites=true&w=majority'
  const localUri = 'mongodb://127.0.0.1:27017/speedtoyz'

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 1500, // Fail fast in 1.5 seconds if IP is blocked
      connectTimeoutMS: 1500,
      tls: true,
      tlsAllowInvalidCertificates: true,
    })
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`)
  } catch (error) {
    console.warn(`⚠️ MongoDB Atlas Connection Warning (${error.message}). Attempting fallback to Local MongoDB...`)
    try {
      const localConn = await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 1000,
        connectTimeoutMS: 1000,
      })
      console.log(`✅ Fallback Local MongoDB Connected: ${localConn.connection.host}`)
    } catch (localErr) {
      console.warn(`⚡ Operating in Standalone Offline Mode (Zero DB Delays). To connect live Atlas DB, add your current IP address in MongoDB Atlas -> Security -> Network Access.`)
    }
  }
}

module.exports = connectDB
