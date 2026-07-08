const express = require('express');
const { GEMINI_API_KEY } = require('../config/appConfig');
const messages = require('../constants/messages');
const { upload, requiredUploadFields } = require('../middleware/upload');
const { prepareReviewDocuments } = require('../services/documentService');
const { generateGeminiFeedback } = require('../services/geminiService');
const { createReview } = require('../services/reviewStore');

const router = express.Router();

function getUploadedFile(files, fieldName) {
  return files[fieldName] && files[fieldName][0];
}

router.post('/check-assignment', upload.fields(requiredUploadFields), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).render('upload', {
        error: messages.geminiApiKeyMissing
      });
    }

    const files = req.files || {};
    const assignmentBrief = getUploadedFile(files, 'assignmentBrief');
    const markingRubric = getUploadedFile(files, 'markingRubric');
    const studentDraft = getUploadedFile(files, 'studentDraft');

    if (!assignmentBrief || !markingRubric || !studentDraft) {
      return res.status(400).render('upload', {
        error: messages.missingUpload
      });
    }

    const reviewDocuments = await prepareReviewDocuments([
      { label: 'Assignment Brief', file: assignmentBrief },
      { label: 'Marking Rubric', file: markingRubric },
      { label: 'Student Assignment Draft', file: studentDraft }
    ]);
    const report = await generateGeminiFeedback(reviewDocuments);
    const reviewId = createReview(report, reviewDocuments);

    res.render('feedback', {
      report,
      reviewId,
      files: {
        assignmentBrief: assignmentBrief.originalname,
        markingRubric: markingRubric.originalname,
        studentDraft: studentDraft.originalname
      }
    });
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    res.status(500).render('upload', {
      error: error.message || messages.analysisFailed
    });
  }
});

module.exports = router;
