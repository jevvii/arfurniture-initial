import { ObjectId } from 'mongodb'

// Email validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export const validateEmail = (req, res, next) => {
  const { email } = req.body
  
  if (!email) {
    return res.status(400).json({ 
      error: 'Email is required',
      field: 'email'
    })
  }
  
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format. Please provide a valid email address.',
      field: 'email',
      example: 'user@example.com'
    })
  }
  
  next()
}

// Password validation
export const validatePassword = (req, res, next) => {
  const { password } = req.body
  
  if (!password) {
    return res.status(400).json({ 
      error: 'Password is required',
      field: 'password'
    })
  }
  
  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'Password must be at least 6 characters long',
      field: 'password',
      minLength: 6
    })
  }
  
  next()
}

// ObjectId validation
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName]
    
    if (!id) {
      return res.status(400).json({ 
        error: `${paramName} is required`,
        field: paramName
      })
    }
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: `Invalid ${paramName} format. Must be a valid MongoDB ObjectId.`,
        field: paramName,
        provided: id,
        example: '507f1f77bcf86cd799439011'
      })
    }
    
    next()
  }
}

// Required fields validation
export const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const missing = []
    
    for (const field of fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && !req.body[field].trim())) {
        missing.push(field)
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: missing,
        requiredFields: fields
      })
    }
    
    next()
  }
}

// File upload validation
export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      field: 'file',
      hint: 'Use multipart/form-data with a file field'
    })
  }
  
  next()
}

// Image file validation
export const validateImageFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
      provided: req.file.mimetype,
      allowed: allowedTypes
    })
  }
  
  next()
}

// Model file validation
export const validateModelFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  
  const allowedTypes = ['model/gltf-binary', 'application/octet-stream']
  const allowedExtensions = ['.glb', '.gltf']
  const fileExt = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'))
  
  if (!allowedTypes.includes(req.file.mimetype) && !allowedExtensions.includes(fileExt)) {
    return res.status(400).json({ 
      error: 'Invalid file type. Only GLB/GLTF model files are allowed.',
      provided: req.file.mimetype,
      allowedTypes,
      allowedExtensions
    })
  }
  
  next()
}
