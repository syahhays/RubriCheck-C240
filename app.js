require('dotenv').config();

const express = require('express');
const path = require('path');
const { PORT, ROOT_DIR } = require('./config/appConfig');
const pageRoutes = require('./routes/pageRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const followUpRoutes = require('./routes/followUpRoutes');
const { uploadErrorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(ROOT_DIR, 'views'));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(ROOT_DIR, 'public')));

app.use(pageRoutes);
app.use(assignmentRoutes);
app.use(followUpRoutes);
app.use(uploadErrorHandler);

app.listen(PORT, () => {
  console.log(`RubriCheck AI is running at http://localhost:${PORT}`);
});
