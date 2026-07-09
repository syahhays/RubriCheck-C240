const express = require('express');
const { GEMINI_API_KEY } = require('../config/appConfig');
const messages = require('../constants/messages');
const { embedText } = require('../services/ollamaEmbeddingService');
const { searchChunks } = require('../services/chromaService');
const { generateGeminiQuestions } = require('../services/geminiService');
const { getLatestReview, getReview } = require('../services/reviewStore');

const router = express.Router();
const QUESTION_CONTEXT_CHUNKS = 8;

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

router.get('/upload', (req, res) => {
  res.render('upload', { error: null });
});

router.get('/analysing', (req, res) => {
  res.render('analysing');
});

router.get('/checklist', (req, res) => {
  res.render('checklist');
});

function getQuestionReview(req) {
  const reviewId = typeof req.query.reviewId === 'string' ? req.query.reviewId : '';

  if (reviewId) {
    const review = getReview(reviewId);
    return review ? { reviewId, review } : null;
  }

  return getLatestReview();
}

async function getQuestionContext(reviewId, review) {
  try {
    const queryEmbedding = await embedText('Generate lecturer viva questions from the assignment brief, marking rubric, student draft, and feedback gaps.');
    const chunks = await searchChunks(queryEmbedding, null, reviewId, QUESTION_CONTEXT_CHUNKS);

    if (chunks.length > 0) {
      return chunks.map((chunk, index) => ({
        label: `Retrieved ${chunk.metadata.documentType} Chunk ${index + 1}`,
        fileName: chunk.metadata.fileName,
        text: chunk.text
      }));
    }
  } catch (error) {
    console.warn('Unable to retrieve Chroma chunks for lecturer questions:', error.message);
  }

  return review.documents;
}

router.get('/questions', async (req, res) => {
  const latest = getQuestionReview(req);

  if (!latest) {
    return res.render('questions', {
      feedbackHref: '/check-assignment',
      reviewId: null,
      review: null,
      questions: [],
      error: messages.reviewExpired
    });
  }

  const feedbackHref = `/check-assignment/${encodeURIComponent(latest.reviewId)}`;

  if (!GEMINI_API_KEY) {
    return res.render('questions', {
      feedbackHref,
      reviewId: latest.reviewId,
      review: latest.review,
      questions: [],
      error: messages.geminiApiKeyMissing
    });
  }

  try {
    const context = await getQuestionContext(latest.reviewId, latest.review);
    const questions = await generateGeminiQuestions(latest.review, context);

    return res.render('questions', {
      feedbackHref,
      reviewId: latest.reviewId,
      review: latest.review,
      questions,
      error: null
    });
  } catch (error) {
    console.error('Gemini lecturer question generation failed:', error);
    return res.render('questions', {
      feedbackHref,
      reviewId: latest.reviewId,
      review: latest.review,
      questions: [],
      error: error.message || messages.geminiQuestionsMissing
    });
  }
});

function getReminderReview(req) {
  const reviewId = typeof req.query.reviewId === 'string' ? req.query.reviewId : '';

  if (reviewId) {
    const review = getReview(reviewId);
    return review ? { reviewId, review } : null;
  }

  return getLatestReview();
}

router.get('/reminder', (req, res) => {
  const latest = getReminderReview(req);

  res.render('reminder', {
    reviewId: latest ? latest.reviewId : null,
    studentInfo: latest ? latest.review.studentInfo : null,
    summary: latest ? latest.review.summary : null
  });
});

module.exports = router;
