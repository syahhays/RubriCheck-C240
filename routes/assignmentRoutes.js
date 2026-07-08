const crypto = require('crypto');
const express = require('express');
const { GEMINI_API_KEY } = require('../config/appConfig');
const messages = require('../constants/messages');
const { upload, requiredUploadFields } = require('../middleware/upload');
const { prepareReviewDocuments } = require('../services/documentService');
const { generateGeminiFeedback } = require('../services/geminiService');
const { createReview, getLatestReview, getReview } = require('../services/reviewStore');

const { chunkDocument } = require('../utils/chunkDocuments');
const { searchChunks, storeChunks } = require('../services/chromaService');
const { embedText, embedTexts } = require('../services/ollamaEmbeddingService');

const router = express.Router();

function getUploadedFile(files, fieldName) {
  return files[fieldName] && files[fieldName][0];
}

function buildRetrievedDocuments(chunks) {
  return chunks.map((chunk, index) => ({
    label: `Retrieved ${chunk.metadata.documentType} Chunk ${index + 1}`,
    fileName: chunk.metadata.fileName,
    text: chunk.text
  }));
}

function getReviewFiles(reviewDocuments) {
  return {
    assignmentBrief: reviewDocuments.find((doc) => doc.label === 'Assignment Brief')?.fileName || 'Assignment Brief',
    markingRubric: reviewDocuments.find((doc) => doc.label === 'Marking Rubric')?.fileName || 'Marking Rubric',
    studentDraft: reviewDocuments.find((doc) => doc.label === 'Student Assignment Draft')?.fileName || 'Student Draft'
  };
}

function getStudentInfo(body) {
  return {
    studentName: typeof body.studentName === 'string' ? body.studentName.trim() : '',
    moduleCode: typeof body.moduleCode === 'string' ? body.moduleCode.trim() : '',
    assignmentName: typeof body.assignmentName === 'string' ? body.assignmentName.trim() : '',
    deadline: typeof body.deadline === 'string' ? body.deadline.trim() : '',
    telegramChatId: typeof body.telegramChatId === 'string' ? body.telegramChatId.trim() : ''
  };
}

function hasRequiredStudentInfo(studentInfo) {
  return Boolean(
    studentInfo.studentName
    && studentInfo.moduleCode
    && studentInfo.assignmentName
    && studentInfo.deadline
    && studentInfo.telegramChatId
  );
}

function renderStoredReview(res, reviewId, review) {
  return res.render('feedback', {
    report: review.report,
    summary: review.summary,
    studentInfo: review.studentInfo,
    reviewId,
    files: getReviewFiles(review.documents)
  });
}

router.get('/check-assignment', (req, res) => {
  const latest = getLatestReview();

  if (!latest) {
    return res.render('feedback', { report: null, summary: null, studentInfo: null, files: null, reviewId: null });
  }

  return renderStoredReview(res, latest.reviewId, latest.review);
});

router.get('/check-assignment/:reviewId', (req, res) => {
  const review = getReview(req.params.reviewId);

  if (!review) {
    return res.render('feedback', { report: null, summary: null, studentInfo: null, files: null, reviewId: null });
  }

  return renderStoredReview(res, req.params.reviewId, review);
});

router.post('/check-assignment', upload.fields(requiredUploadFields), async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).render('upload', {
        error: messages.geminiApiKeyMissing
      });
    }

    const files = req.files || {};
    const studentInfo = getStudentInfo(req.body || {});
    const assignmentBrief = getUploadedFile(files, 'assignmentBrief');
    const markingRubric = getUploadedFile(files, 'markingRubric');
    const studentDraft = getUploadedFile(files, 'studentDraft');

    if (!hasRequiredStudentInfo(studentInfo)) {
      return res.status(400).render('upload', {
        error: 'Please complete the student information before checking the assignment.'
      });
    }

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

    const submissionId = crypto.randomUUID();
    const chunks = reviewDocuments.flatMap((document) =>
      chunkDocument(document.text, document.label, document.fileName, submissionId)
    );
    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
    await storeChunks(submissionId, chunks, embeddings);

    const reviewQuery = 'Check whether the student draft meets the assignment brief and marking rubric requirements.';
    const queryEmbedding = await embedText(reviewQuery);
    const relevantChunks = await searchChunks(queryEmbedding, null, submissionId, 8);
    const documentsForFeedback = relevantChunks.length > 0
      ? buildRetrievedDocuments(relevantChunks)
      : reviewDocuments;

    console.log(`Retrieved ${relevantChunks.length} chunks from ChromaDB for Gemini feedback`);

    const feedback = await generateGeminiFeedback(documentsForFeedback);
    const reviewId = createReview(submissionId, feedback.report, reviewDocuments, feedback.summary, studentInfo);

    res.redirect(`/check-assignment/${reviewId}`);
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    res.status(500).render('upload', {
      error: error.message || messages.analysisFailed
    });
  }
});

module.exports = router;
