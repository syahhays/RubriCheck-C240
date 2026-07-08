const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

router.get('/upload', (req, res) => {
  res.render('upload', { error: null });
});

router.get('/analysing', (req, res) => {
  res.render('analysing');
});

router.get('/feedback', (req, res) => {
  res.render('feedback', { report: null, files: null, reviewId: null });
});

router.get('/checklist', (req, res) => {
  res.render('checklist');
});

router.get('/questions', (req, res) => {
  res.render('questions');
});

router.get('/reminder', (req, res) => {
  res.render('reminder');
});

module.exports = router;
