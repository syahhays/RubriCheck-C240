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

function sanitizeDownloadName(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return cleaned || fallback;
}

function buildDownloadText(review) {
  const studentInfo = review.studentInfo || {};
  const summary = review.summary || {};
  const lines = [
    'RubriCheck AI Feedback Report',
    '',
    `Student: ${studentInfo.studentName || 'Not provided'}`,
    `Module: ${studentInfo.moduleCode || 'Not provided'}`,
    `Assignment: ${studentInfo.assignmentName || 'Not provided'}`,
    `Deadline: ${studentInfo.deadline || 'Not provided'}`,
    '',
    `Completion Percentage: ${summary.completionPercentage ?? 'Not provided'}%`,
    `Readiness Score: ${summary.readinessScore ?? 'Not provided'}%`,
    `Readiness Level: ${summary.readinessLevel || 'Not provided'}`,
    `Final Recommendation: ${summary.finalRecommendation || 'Not provided'}`,
    '',
    'Top 3 Priorities:',
    ...(Array.isArray(summary.topPriorities) ? summary.topPriorities.map((item, index) => `${index + 1}. ${item}`) : ['Not provided.']),
    '',
    'Before-Submission Checklist:',
    ...(Array.isArray(summary.checklist) ? summary.checklist.map((item, index) => `${index + 1}. ${item}`) : ['Not provided.']),
    '',
    'Missing or Weak Areas:',
    ...(Array.isArray(summary.missingWeakAreas) ? summary.missingWeakAreas.map((item, index) => `${index + 1}. ${item}`) : ['Not provided.']),
    '',
    'Full Feedback:',
    review.report || summary.fullFeedback || 'Not provided.'
  ];

  return lines.join('\n');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDownloadHtml(review) {
  const text = buildDownloadText(review);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RubriCheck AI Feedback Report</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.55; max-width: 860px; margin: 40px auto; padding: 0 20px; color: #172033; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <pre>${escapeHtml(text)}</pre>
</body>
</html>`;
}

router.get('/check-assignment', (req, res) => {
  const latest = getLatestReview();

  if (!latest) {
    return res.render('feedback', { report: null, summary: null, studentInfo: null, files: null, reviewId: null });
  }

  return renderStoredReview(res, latest.reviewId, latest.review);
});

router.get('/check-assignment/:reviewId/download.txt', (req, res) => {
  const review = getReview(req.params.reviewId);

  if (!review) {
    return res.status(404).type('text/plain').send(messages.reviewExpired);
  }

  const fileName = `${sanitizeDownloadName(review.studentInfo?.assignmentName, 'rubricheck-report')}.txt`;
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.type('text/plain').send(buildDownloadText(review));
});

router.get('/check-assignment/:reviewId/download.html', (req, res) => {
  const review = getReview(req.params.reviewId);

  if (!review) {
    return res.status(404).type('text/plain').send(messages.reviewExpired);
  }

  const fileName = `${sanitizeDownloadName(review.studentInfo?.assignmentName, 'rubricheck-report')}.html`;
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.type('html').send(buildDownloadHtml(review));
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

    // Query each document type separately so rubric/brief chunks (often
    // numerous due to numbered criteria) can't crowd the student draft out
    // of the results - the draft must always be represented.
    const retrievalLimits = {
      'Assignment Brief': 4,
      'Marking Rubric': 4,
      'Student Assignment Draft': 8
    };

    const relevantChunks = (
      await Promise.all(
        Object.entries(retrievalLimits).map(([documentType, limit]) =>
          searchChunks(queryEmbedding, documentType, submissionId, limit)
        )
      )
    ).flat();

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
