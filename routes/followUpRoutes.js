const express = require('express');
const { GEMINI_API_KEY, MAX_FOLLOW_UP_CHARS } = require('../config/appConfig');
const messages = require('../constants/messages');
const { generateGeminiFollowUp } = require('../services/geminiService');
const { getReview } = require('../services/reviewStore');

const router = express.Router();

router.post('/feedback/follow-up', async (req, res) => {
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

    const answer = await generateGeminiFollowUp(review, question);
    res.json({ answer });
  } catch (error) {
    console.error('Gemini follow-up failed:', error);
    res.status(500).json({
      error: error.message || messages.followUpFailed
    });
  }
});

module.exports = router;
