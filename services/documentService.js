const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { MAX_DOC_CHARS } = require('../config/appConfig');

async function extractDocumentText(file) {
  const mime = file.mimetype;

  if (mime === 'text/plain') {
    return file.buffer.toString('utf8');
  }

  if (mime === 'application/pdf') {
    try {
      const data = await pdf(file.buffer);
      return data && data.text ? data.text : '';
    } catch (err) {
      console.warn('PDF text extraction failed for', file.originalname, err.message);
      return '';
    }
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result && result.value ? result.value : '';
    } catch (err) {
      console.warn('DOCX text extraction failed for', file.originalname, err.message);
      return '';
    }
  }

  return file.buffer.toString('utf8');
}

async function prepareReviewDocuments(documents) {
  const reviewDocuments = [];

  for (const { label, file } of documents) {
    const extracted = await extractDocumentText(file);
    let textToSend = extracted || '[Unable to extract text from this file]';

    if (textToSend.length > MAX_DOC_CHARS) {
      console.warn(`Truncating ${file.originalname} from ${textToSend.length} to ${MAX_DOC_CHARS} characters to keep request size small.`);
      textToSend = textToSend.slice(0, MAX_DOC_CHARS) + '\n\n[TEXT TRUNCATED: full document longer than allowed]';
    }

    reviewDocuments.push({
      label,
      fileName: file.originalname,
      text: textToSend
    });
  }

  return reviewDocuments;
}

module.exports = {
  prepareReviewDocuments
};
