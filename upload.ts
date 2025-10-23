import multer from 'multer';
import { Request } from 'express';

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only Excel files
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream' // Sometimes Excel files are detected as this
  ];

  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

export const uploadExcel = upload.single('file');

// Error handler for multer errors
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: 'Only one file is allowed'
      });
    }
  }

  if (error.message === 'Only Excel files (.xlsx, .xls) are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message
    });
  }

  next(error);
};