const express = require('express');
const { GEMINI_API_KEY, MAX_FOLLOW_UP_CHARS } = require('../config/appConfig');
const messages = require('../constants/messages');
const { embedText } = require('../services/ollamaEmbeddingService');
const { searchChunks } = require('../services/chromaService');
const { generateGeminiFollowUp } = require('../services/geminiService');
const { getReview } = require('../services/reviewStore');

const FOLLOW_UP_MATCH_LIMITS = {
  'Assignment Brief': 3,
  'Marking Rubric': 3,
  'Student Assignment Draft': 4
};

async function retrieveFollowUpContext(submissionId, question, fallbackDocuments) {
  const questionEmbedding = await embedText(question);

  const matches = (
    await Promise.all(
      Object.entries(FOLLOW_UP_MATCH_LIMITS).map(([documentType, limit]) =>
        searchChunks(questionEmbedding, documentType, submissionId, limit)
      )
    )
  ).flat();

  if (matches.length === 0) {
    return fallbackDocuments;
  }

  return matches.map((match, index) => ({
    label: `Retrieved ${match.metadata.documentType} Chunk ${index + 1}`,
    fileName: match.metadata.fileName,
    text: match.text
  }));
}

const router = express.Router();

router.post('/check-assignment/follow-up', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: messages.geminiApiKeyMissing
      });
    }

    const reviewId = typeof req.body.reviewId === 'string' ? req.body.reviewId : '';
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    const review = getReview(reviewId);

    if (!review) {
      return res.status(404).json({
        error: messages.reviewExpired
      });
    }

    if (!question) {
      return res.status(400).json({ error: messages.followUpQuestionMissing });
    }

    if (question.length > MAX_FOLLOW_UP_CHARS) {
      return res.status(400).json({ error: messages.followUpQuestionTooLong });
    }

    const groundedChunks = await retrieveFollowUpContext(reviewId, question, review.documents);
    const answer = await generateGeminiFollowUp(review, question, groundedChunks);
    res.json({ answer });
  } catch (error) {
    console.error('Gemini follow-up failed:', error);
    res.status(500).json({
      error: error.message || messages.followUpFailed
    });
  }
});

module.exports = router;
