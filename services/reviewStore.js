const crypto = require('crypto');
const { REVIEW_TTL_MS } = require('../config/appConfig');

const reviews = new Map();

function createReview(report, documents) {
  const reviewId = crypto.randomUUID();

  reviews.set(reviewId, {
    createdAt: Date.now(),
    report,
    documents: documents.map(({ label, fileName, text }) => ({ label, fileName, text }))
  });

  cleanupExpiredReviews();

  return reviewId;
}

function getReview(reviewId) {
  const review = reviews.get(reviewId);

  if (!review) {
    return null;
  }

  if (Date.now() - review.createdAt > REVIEW_TTL_MS) {
    reviews.delete(reviewId);
    return null;
  }

  return review;
}

function cleanupExpiredReviews() {
  const now = Date.now();

  for (const [reviewId, review] of reviews.entries()) {
    if (now - review.createdAt > REVIEW_TTL_MS) {
      reviews.delete(reviewId);
    }
  }
}

module.exports = {
  createReview,
  getReview
};
