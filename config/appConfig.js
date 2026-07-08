const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';
const CHROMA_COLLECTION = process.env.CHROMA_COLLECTION || 'rubricheck_documents';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const MAX_DOC_CHARS = 131072;
const REVIEW_TTL_MS = 60 * 60 * 1000;
const MAX_FOLLOW_UP_CHARS = 1000;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const SUPPORTED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const REQUIRED_UPLOAD_FIELDS = [
  { name: 'assignmentBrief', maxCount: 1 },
  { name: 'markingRubric', maxCount: 1 },
  { name: 'studentDraft', maxCount: 1 }
];

module.exports = {
  ROOT_DIR,
  PORT,
  GEMINI_MODEL,
  GEMINI_API_KEY,
  CHROMA_HOST,
  CHROMA_PORT,
  CHROMA_COLLECTION,
  OLLAMA_BASE_URL,
  OLLAMA_EMBEDDING_MODEL,
  MAX_DOC_CHARS,
  REVIEW_TTL_MS,
  MAX_FOLLOW_UP_CHARS,
  MAX_UPLOAD_BYTES,
  SUPPORTED_FILE_TYPES,
  REQUIRED_UPLOAD_FIELDS
};
