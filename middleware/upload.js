const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `car-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase())
  const mimeOk = allowed.test(file.mimetype)
  if (extOk && mimeOk) cb(null, true)
  else cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'))
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5_000_000 },
})

module.exports = upload
