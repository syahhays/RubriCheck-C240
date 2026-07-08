const { GEMINI_API_KEY, GEMINI_MODEL } = require('../config/appConfig');
const messages = require('../constants/messages');
const { buildFollowUpPrompt, finalPrompt } = require('../prompts/geminiPrompts');

function buildDocumentParts(documents) {
  const documentParts = [];

  for (const document of documents) {
    documentParts.push({ text: `${document.label}: ${document.fileName}` });
    documentParts.push({ text: document.text });
  }

  return documentParts;
}

async function generateContent(parts) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message = data.error && data.error.message
      ? data.error.message
      : messages.geminiError;
    throw new Error(message);
  }

  return data.candidates
    && data.candidates[0]
    && data.candidates[0].content
    && data.candidates[0].content.parts
    && data.candidates[0].content.parts.map((part) => part.text || '').join('\n').trim();
}

async function generateGeminiFeedback(documents) {
  const text = await generateContent([
    ...buildDocumentParts(documents),
    { text: finalPrompt }
  ]);

  if (!text) {
    throw new Error(messages.geminiFeedbackMissing);
  }

  return text;
}

async function generateGeminiFollowUp(review, question) {
  const text = await generateContent([
    ...buildDocumentParts(review.documents),
    { text: `Generated Feedback Report:\n${review.report}` },
    { text: `Student Follow-up Question:\n${question}` },
    { text: buildFollowUpPrompt() }
  ]);

  if (!text) {
    throw new Error(messages.geminiFollowUpMissing);
  }

  return text;
}

module.exports = {
  generateGeminiFeedback,
  generateGeminiFollowUp
};
