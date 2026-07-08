const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

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
  res.render('upload');
});

app.get('/analysing', (req, res) => {
  res.render('analysing');
});

app.get('/feedback', (req, res) => {
  res.render('feedback');
});

app.get('/checklist', (req, res) => {
  res.render('checklist');
});

app.get('/questions', (req, res) => {
  res.render('questions');
});

app.get('/reminder', (req, res) => {
  res.render('reminder');
});

app.listen(PORT, () => {
  console.log(`RubriCheck AI is running at http://localhost:${PORT}`);
});
