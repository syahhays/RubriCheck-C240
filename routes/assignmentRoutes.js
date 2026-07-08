const express = require('express');
const { GEMINI_API_KEY } = require('../config/appConfig');
const messages = require('../constants/messages');
const { upload, requiredUploadFields } = require('../middleware/upload');
const { prepareReviewDocuments } = require('../services/documentService');
const { generateGeminiFeedback } = require('../services/geminiService');
const { createReview } = require('../services/reviewStore');

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

    const submissionId = Date.now().toString();
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

    const report = await generateGeminiFeedback(documentsForFeedback);
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
