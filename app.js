require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const finalPrompt = `You are RubriCheck AI, an academic assignment reviewer for polytechnic students.

You will receive three uploaded documents:
1. Assignment Brief
2. Marking Rubric
3. Student Assignment Draft

Your task is to evaluate the student's draft ONLY using the uploaded Assignment Brief and Marking Rubric.

Your purpose is to help students identify missing requirements before submission.

Do NOT:
- Predict grades or marks.
- Guarantee assignment results.
- Rewrite or generate assignment content.
- Invent rubric requirements.
- Encourage plagiarism.

Instead, provide clear, concise and actionable feedback.

=====================================================

Generate the report using ONLY the following structure.

# 📄 Assignment Overview

Provide:

• Assignment Name
• Assignment Objective
• Submission Requirements
• Overall Completion Percentage (NOT a grade)

If information is unavailable, write:
"Not provided."

-----------------------------------------------------

# 🚦 Submission Readiness

Choose ONE:

🟢 Nearly Ready

🟡 Needs Some Improvement

🟠 Needs Major Improvement

🔴 Not Ready

Then explain your decision in no more than 3 short sentences.

-----------------------------------------------------

# ⭐ Top 3 Priorities

List ONLY the three most important improvements.

Example:

1. Add Discussion section
2. Include APA References
3. Expand Introduction

Keep each item under one sentence.

-----------------------------------------------------

# 📋 Rubric Checklist

Create a simple table.

| Rubric Item | Status |

Status can ONLY be:

✅ Completed

🟡 Needs Improvement

❌ Missing

⚪ Unable to Determine

Do not include long explanations.

-----------------------------------------------------

# 💡 Improvement Suggestions

Group suggestions into:

🔴 High Priority

🟡 Medium Priority

For each item provide ONLY:

• What needs improvement

• Why it matters

• Next action

Maximum 3 bullet points per item.

Keep explanations short.

-----------------------------------------------------

# ✅ Before Submission Checklist

Generate a checklist.

Example:

☐ Introduction complete

☐ Discussion completed

☐ References included

☐ APA formatting checked

☐ Grammar checked

Use short checklist items only.

-----------------------------------------------------

# 🎓 Possible Lecturer Questions

Generate exactly FIVE questions.

Questions should test:

• Understanding

• Justification

• Research

• Critical thinking

Keep each question to one sentence.

-----------------------------------------------------

# 📊 Final Summary

Provide:

Completion Percentage:

Submission Readiness:

Final Recommendation:

Top Priority:

Each should be one short sentence.

=====================================================

Writing Rules

- Use short paragraphs.
- Avoid repeating information.
- Avoid long explanations.
- Avoid repeating rubric descriptions.
- Be concise.
- Keep the report visually easy to scan.
- Prioritize readability over detail.
- Use markdown headings and bullet points.`;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]);

    if (allowedTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Only PDF, DOCX, and TXT files are supported.'));
  }
});

const requiredUploadFields = [
  { name: 'assignmentBrief', maxCount: 1 },
  { name: 'markingRubric', maxCount: 1 },
  { name: 'studentDraft', maxCount: 1 }
];

const pdf = require('pdf-parse');
const mammoth = require('mammoth');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

app.get('/upload', (req, res) => {
  res.render('upload', { error: null });
});

app.get('/analysing', (req, res) => {
  res.render('analysing');
});

app.get('/feedback', (req, res) => {
  res.render('feedback', { report: null, files: null });
});

app.post('/check-assignment', upload.fields(requiredUploadFields), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).render('upload', {
        error: 'Gemini API key is not configured. Set GEMINI_API_KEY before running the app.'
      });
    }

    const files = req.files || {};
    const assignmentBrief = files.assignmentBrief && files.assignmentBrief[0];
    const markingRubric = files.markingRubric && files.markingRubric[0];
    const studentDraft = files.studentDraft && files.studentDraft[0];

    if (!assignmentBrief || !markingRubric || !studentDraft) {
      return res.status(400).render('upload', {
        error: 'Please upload the Assignment Brief, Marking Rubric, and Student Draft.'
      });
    }

    const report = await generateGeminiFeedback([
      { label: 'Assignment Brief', file: assignmentBrief },
      { label: 'Marking Rubric', file: markingRubric },
      { label: 'Student Assignment Draft', file: studentDraft }
    ]);

    res.render('feedback', {
      report,
      files: {
        assignmentBrief: assignmentBrief.originalname,
        markingRubric: markingRubric.originalname,
        studentDraft: studentDraft.originalname
      }
    });
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    res.status(500).render('upload', {
      error: error.message || 'Unable to analyse the uploaded documents. Please try again.'
    });
  }
});

async function generateGeminiFeedback(documents) {
  const MAX_DOC_CHARS = 131072; // ~128 KB per document; adjust as needed

  async function extractText(file) {
    const mime = file.mimetype;

    if (mime === 'text/plain') {
      return file.buffer.toString('utf8');
    }

    if (mime === 'application/pdf') {
      try {
        const data = await pdf(file.buffer);
        return data && data.text ? data.text : '';
      } catch (err) {
        console.warn('PDF text extraction failed for', file.originalname, err.message);
        return '';
      }
    }

    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result && result.value ? result.value : '';
      } catch (err) {
        console.warn('DOCX text extraction failed for', file.originalname, err.message);
        return '';
      }
    }

    return file.buffer.toString('utf8');
  }

  const documentParts = [];
  for (const { label, file } of documents) {
    const extracted = await extractText(file);
    let textToSend = extracted || '[Unable to extract text from this file]';
    if (textToSend.length > MAX_DOC_CHARS) {
      console.warn(`Truncating ${file.originalname} from ${textToSend.length} to ${MAX_DOC_CHARS} characters to keep request size small.`);
      textToSend = textToSend.slice(0, MAX_DOC_CHARS) + '\n\n[TEXT TRUNCATED: full document longer than allowed]';
    }

    documentParts.push({ text: `${label}: ${file.originalname}` });
    documentParts.push({ text: textToSend });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              ...documentParts,
              { text: finalPrompt }
            ]
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
      : 'Gemini returned an error.';
    throw new Error(message);
  }

  const text = data.candidates
    && data.candidates[0]
    && data.candidates[0].content
    && data.candidates[0].content.parts
    && data.candidates[0].content.parts.map((part) => part.text || '').join('\n').trim();

  if (!text) {
    throw new Error('Gemini did not return feedback text.');
  }

  return text;
}

app.get('/checklist', (req, res) => {
  res.render('checklist');
});

app.get('/questions', (req, res) => {
  res.render('questions');
});

app.get('/reminder', (req, res) => {
  res.render('reminder');
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message) {
    return res.status(400).render('upload', {
      error: error.code === 'LIMIT_FILE_SIZE'
        ? 'Each uploaded file must be 12 MB or smaller.'
        : error.message
    });
  }

  next(error);
});

app.listen(PORT, () => {
  console.log(`RubriCheck AI is running at http://localhost:${PORT}`);
});
