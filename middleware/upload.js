const multer = require('multer');
const {
  MAX_UPLOAD_BYTES,
  REQUIRED_UPLOAD_FIELDS,
  SUPPORTED_FILE_TYPES
} = require('../config/appConfig');
const messages = require('../constants/messages');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_FILE_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error(messages.unsupportedFileType));
  }
});

module.exports = {
  multer,
  upload,
  requiredUploadFields: REQUIRED_UPLOAD_FIELDS
};
