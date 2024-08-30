import csvParser from 'csv-parser';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
class Middlewares {
  
  static isValidCSV(req, res, next) {
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log(filePath,req.file);
    const requiredColumns = ['S. No.', 'Product Name', 'Input Image Urls'];

    let isValid = true;
    let errorMessages = [];

    // Read and validate the CSV file
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headers) => {
        // Check if all required columns are present
        const missingColumns = requiredColumns.filter(column => !headers.includes(column));
        if (missingColumns.length > 0) {
          isValid = false;
          errorMessages.push(`Missing columns: ${missingColumns.join(', ')}`);
        }
      })
      .on('data', (data) => {
        // Check each row for required fields
        requiredColumns.forEach((column) => {
          if (!data[column] || data[column].trim() === '') {
            isValid = false;
            errorMessages.push(`Missing or empty value in column: ${column}`);
          }
        });

        // Additional validation for URLs (ensure that 'Input Image Urls' contains valid URLs)
        const urls = data['Input Image Urls'] ? data['Input Image Urls'].split(',') : [];
        urls.forEach((url, index) => {
          try {
            //parses the given string as a URL and will throw an error if the string is not a valid URL.
            new URL(url.trim());
          } catch (_) {
            isValid = false;
            errorMessages.push(`Invalid URL in 'Input Image Urls' at row ${data['Serial Number']}, index ${index + 1}`);
          }
        });

        results.push(data);
      })
      .on('end', () => {
        if (!isValid) {
          return res.status(400).json({ message: 'CSV validation failed', errors: errorMessages });
        }
        // If the CSV is valid, attach the parsed data to the request object and proceed
        req.csvData = results;
        next();
      })
      .on('error', (err) => {
        return res.status(500).json({ message: 'Error processing CSV file', error: err.message });
      });
  }
  
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
  })

}

export default Middlewares;
