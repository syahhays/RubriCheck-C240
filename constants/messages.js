module.exports = {
  geminiApiKeyMissing: 'Gemini API key is not configured. Set GEMINI_API_KEY before running the app.',
  missingUpload: 'Please upload the Assignment Brief, Marking Rubric, and Student Draft.',
  unsupportedFileType: 'Only PDF, DOCX, and TXT files are supported.',
  uploadTooLarge: 'Each uploaded file must be 12 MB or smaller.',
  analysisFailed: 'Unable to analyse the uploaded documents. Please try again.',
  reviewExpired: 'This feedback report is no longer available. Please upload the assignment again.',
  followUpQuestionMissing: 'Please enter a follow-up question.',
  followUpQuestionTooLong: 'Please keep the question under 1000 characters.',
  followUpFailed: 'Unable to answer the follow-up question. Please try again.',
  geminiError: 'Gemini returned an error.',
  geminiFeedbackMissing: 'Gemini did not return feedback text.',
  geminiFollowUpMissing: 'Gemini did not return a follow-up answer.',
  geminiQuestionsMissing: 'Gemini did not return lecturer questions.'
};
