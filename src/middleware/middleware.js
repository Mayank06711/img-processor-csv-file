import csvParser from 'csv-parser';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
class Middlewares {
  
  // Set up storage configuration for multer
  static storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/upload'); // directory to save uploaded files
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Get the file extension
    const basename = path.basename(file.originalname, ext); // Get the file name without extension
    cb(null, `${basename}-${Date.now()}${ext}`); // Set the file name with a timestamp
  }
  });
  
  // Set up multer upload middleware
  static upload = multer({
    storage: Middlewares.storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(csv)$/)) {
        return cb(new Error('Only CSV files are allowed.'), false);
      }
      cb(null, true);
    }
  }).single('csv')


  // upload upload middleware for catching its errors
  static uploadErrorCatch = (err, req, res, next) => {
    this.upload(req, res, err=>{
      if (err) {
        next(err)
      }
      next();
    })
  }

  static errorHandler = (err, req, res, next) => {
    // Log the error (optional, but useful for debugging)
    console.error(err.stack);
  
    // Determine the status code
    const statusCode = err.statusCode || 500;

    // Send a JSON response with the error details
    res.status(statusCode).json({
      success: false,
      error: {
        status: statusCode,
        message: err.message || 'An unexpected error occurred'
      }
    });
  };
}

export default Middlewares;
