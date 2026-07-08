const { REVIEW_TTL_MS } = require('../config/appConfig');
const { deleteSubmission } = require('./chromaService');

const reviews = new Map();
let latestReviewId = null;

function createReview(reviewId, report, documents, summary = null, studentInfo = {}) {
  reviews.set(reviewId, {
    createdAt: Date.now(),
    report,
    summary,
    studentInfo,
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
    deleteSubmission(reviewId).catch((err) => {
      console.warn('Failed to clean up Chroma vectors for expired review', reviewId, err.message);
    });
    return null;
  }

  return review;
}

function cleanupExpiredReviews() {
  const now = Date.now();

  for (const [reviewId, review] of reviews.entries()) {
    if (now - review.createdAt > REVIEW_TTL_MS) {
      reviews.delete(reviewId);
      deleteSubmission(reviewId).catch((err) => {
        console.warn('Failed to clean up Chroma vectors for expired review', reviewId, err.message);
      });

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
