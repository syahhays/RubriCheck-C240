const crypto = require('crypto');
const { REVIEW_TTL_MS } = require('../config/appConfig');

const reviews = new Map();
let latestReviewId = null;

function createReview(report, documents) {
  const reviewId = crypto.randomUUID();

  reviews.set(reviewId, {
    createdAt: Date.now(),
    report,
    documents: documents.map(({ label, fileName, text }) => ({ label, fileName, text }))
  });

  latestReviewId = reviewId;
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

      if (latestReviewId === reviewId) {
        latestReviewId = null;
      }
    }
  }
}

function getLatestReview() {
  if (!latestReviewId) {
    return null;
  }

  const review = getReview(latestReviewId);

  if (!review) {
    latestReviewId = null;
    return null;
  }

  return {
    reviewId: latestReviewId,
    review
  };
}

module.exports = {
  createReview,
  getReview,
  getLatestReview
};
