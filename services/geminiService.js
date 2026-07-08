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

function clampPercent(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function cleanList(values, fallback = []) {
  if (!Array.isArray(values)) {
    return fallback;
  }

  const cleaned = values
    .map((item) => cleanText(String(item || '').replace(/^[-*\d.\s[\]xX]+/, '')))
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : fallback;
}

function parseJsonFeedback(text) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  const candidates = [trimmed, withoutFence];
  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(withoutFence.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      // Keep trying the next candidate. Gemini may wrap JSON in short explanatory text.
    }
  }

  return null;
}

function extractPercent(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escapedLabel}[^\\d]{0,40}(\\d{1,3})\\s*%?`, 'i'));

  return match ? clampPercent(match[1]) : null;
}

function extractNumberedList(text, heading) {
  const headingIndex = text.toLowerCase().indexOf(heading.toLowerCase());

  if (headingIndex === -1) {
    return [];
  }

  const afterHeading = text.slice(headingIndex + heading.length);
  const nextHeading = afterHeading.search(/\n\s*#/);
  const section = nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);

  return section
    .split('\n')
    .map((line) => cleanText(line.replace(/^[-*]|\d+[.)]/, '')))
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeFeedbackSummary(rawSummary, originalText) {
  const source = rawSummary && typeof rawSummary === 'object' ? rawSummary : {};
  const completionPercentage = clampPercent(source.completionPercentage)
    ?? extractPercent(originalText, 'Completion Percentage')
    ?? extractPercent(originalText, 'Overall Completion Percentage');
  const readinessScore = clampPercent(source.readinessScore)
    ?? extractPercent(originalText, 'Readiness Score')
    ?? completionPercentage;

  return {
    completionPercentage,
    readinessScore,
    readinessLevel: cleanText(source.readinessLevel) || 'Needs Review',
    finalRecommendation: cleanText(source.finalRecommendation) || 'Review Before Submission',
    topPriorities: cleanList(source.topPriorities, extractNumberedList(originalText, 'Top 3 Priorities').slice(0, 3)),
    checklist: cleanList(source.checklist, extractNumberedList(originalText, 'Before Submission Checklist')),
    missingWeakAreas: cleanList(source.missingWeakAreas, extractNumberedList(originalText, 'Improvement Suggestions')),
    fullFeedback: cleanText(source.fullFeedback) ? source.fullFeedback.trim() : originalText
  };
}

function parseFeedbackResponse(text) {
  const parsedJson = parseJsonFeedback(text);
  const summary = normalizeFeedbackSummary(parsedJson, text);

  return {
    report: summary.fullFeedback || text,
    summary
  };
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

  return parseFeedbackResponse(text);
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
