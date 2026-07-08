const express = require('express');
const { getLatestReview, getReview } = require('../services/reviewStore');

const router = express.Router();

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

router.get('/questions', (req, res) => {
  const reviewId = typeof req.query.reviewId === 'string' ? req.query.reviewId : '';
  const feedbackHref = reviewId ? `/check-assignment/${encodeURIComponent(reviewId)}` : '/check-assignment';

  res.render('questions', { feedbackHref });
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
