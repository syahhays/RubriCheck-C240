const { multer } = require('./upload');
const messages = require('../constants/messages');

function uploadErrorHandler(error, req, res, next) {
  if (error instanceof multer.MulterError || error.message) {
    return res.status(400).render('upload', {
      error: error.code === 'LIMIT_FILE_SIZE'
        ? messages.uploadTooLarge
        : error.message
    });
  }

  next(error);
}

module.exports = {
  uploadErrorHandler
};
