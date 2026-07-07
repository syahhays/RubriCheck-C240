require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const finalPrompt = `Analyse the uploaded Assignment Brief, Marking Rubric, and Student Assignment Draft.

Evaluate the student's work based only on the uploaded documents.

Create a structured feedback report with these sections:

1. Assignment Details
- Module Code
- Assignment Name
- Assignment Deadline
- Assignment Objectives
- Required Assignment Sections
- Submission Requirements
If any information is missing, write: "Not provided in the uploaded documents."

2. Assignment Requirements Summary
- Objectives
- Required sections
- Submission requirements

3. Rubric Evaluation
For every rubric criterion:
- Rubric Criterion
- Requirement
- Status: Completed / Needs Improvement / Missing / Unable to Determine
- Evidence Found
- Missing or Weak Elements
- Suggested Improvement

4. Assignment Completion Breakdown
- Total requirements checked
- Number completed
- Number needing improvement
- Number missing
- Number unable to determine

5. Assignment Completion Percentage
Show: Assignment Completion Percentage: XX%
Explain how it was determined.
This is NOT a predicted grade.

6. Missing or Weak Areas
Rank issues from highest priority to lowest priority.

7. Improvement Suggestions
Group into High Priority, Medium Priority, and Low Priority.
For each suggestion, include:
- What needs improvement
- Why it matters
- Related assignment/rubric requirement
- Next action

8. Before-Submission Checklist
For each item:
- Checklist Item
- Status: Completed / Needs Improvement / Missing
- Action Required

9. Possible Lecturer Questions
Generate 5 questions testing understanding, reasoning, justification, research, tools used, limitations, and improvements.

10. Overall Submission Readiness
Include:
- Submission Readiness Level
- Final Submission Recommendation
- Explanation
- Top 3 Priorities

Readiness levels:
- Nearly Ready
- Needs Some Improvement
- Needs Major Improvement
- Not Ready for Submission

Final recommendations:
- Ready for Submission
- Review Before Submission
- Major Improvements Required
- Not Ready for Submission

At the end, also include a short section titled "n8n Reminder Fields" with:
- Completion Percentage
- Readiness Level
- Top 3 Priorities
- Before-Submission Checklist Summary
- Final Submission Recommendation
Make this section easy for the student to copy into the n8n form.

Important rules:
- Use only the uploaded documents.
- Do not invent requirements.
- Do not predict grades, marks, or GPA.
- Do not write or rewrite the student's assignment.
- Do not generate paragraphs the student can copy directly.
- Do not encourage plagiarism.
- Be objective, constructive, supportive, and professional.`;

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
  const documentParts = documents.flatMap(({ label, file }) => [
    { text: `${label}: ${file.originalname}` },
    {
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64')
      }
    }
  ]);

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
