// Small beginner-friendly interaction for the static frontend demo.
// More page-specific JavaScript can be added here in later prompts.
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPath = window.location.pathname;
  const loginButton = document.querySelector('[data-login-open]');
  const loginModal = document.querySelector('[data-login-modal]');
  const closeLoginButton = document.querySelector('[data-login-close]');
  const demoLoginButton = document.querySelector('[data-demo-login]');
  const userChip = document.querySelector('[data-user-chip]');
  const authArea = document.querySelector('.auth-area');
  const uploadCards = document.querySelectorAll('[data-upload-card]');
  const uploadForm = document.querySelector('[data-upload-form]');
  const loadDemoFilesButton = document.querySelector('[data-load-demo-files]');
  const analyseButton = document.querySelector('[data-analyse-button]');
  const uploadNote = document.querySelector('[data-upload-note]');
  const analysisProgress = document.querySelector('[data-analysis-progress]');
  const analysisPercent = document.querySelector('[data-analysis-percent]');
  const analysisSteps = document.querySelectorAll('[data-analysis-steps] .analysis-step');
  const reportTabs = document.querySelectorAll('[data-report-tab]');
  const reportPanels = document.querySelectorAll('[data-report-panel]');
  const downloadChecklistButtons = document.querySelectorAll('[data-download-checklist]');
  const regenerateQuestionsButton = document.querySelector('[data-regenerate-questions]');
  const questionList = document.querySelector('[data-question-list]');
  const questionCount = document.querySelector('[data-question-count]');

  navLinks.forEach((link) => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  if (authArea && userChip && !authArea.querySelector('[data-demo-logout]')) {
    const accountMenu = document.createElement('div');
    accountMenu.className = 'account-menu';
    accountMenu.innerHTML = '<button class="logout-button" type="button" data-demo-logout>Log Out</button>';
    authArea.appendChild(accountMenu);
  }

  if (userChip && authArea) {
    userChip.addEventListener('click', (event) => {
      event.preventDefault();
      authArea.classList.toggle('menu-open');
    });

    document.addEventListener('click', (event) => {
      if (!authArea.contains(event.target)) {
        authArea.classList.remove('menu-open');
      }
    });
  }

  function showLoggedInState() {
    if (!loginButton || !userChip) {
      return;
    }

    loginButton.classList.add('hidden');
    userChip.classList.remove('hidden');

    if (authArea) {
      authArea.classList.add('is-logged-in');
    }
  }

  function showLoggedOutState() {
    if (!loginButton || !userChip) {
      return;
    }

    localStorage.removeItem('rubricheckDemoLoggedIn');
    userChip.classList.add('hidden');
    loginButton.classList.remove('hidden');

    if (authArea) {
      authArea.classList.remove('is-logged-in');
      authArea.classList.remove('menu-open');
    }

    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  function openLoginModal() {
    if (loginModal) {
      loginModal.classList.remove('hidden');
    }
  }

  function closeLoginModal() {
    if (loginModal) {
      loginModal.classList.add('hidden');
    }
  }

  if (localStorage.getItem('rubricheckDemoLoggedIn') === 'true') {
    showLoggedInState();
  }

  if (loginButton) {
    loginButton.addEventListener('click', openLoginModal);
  }

  if (closeLoginButton) {
    closeLoginButton.addEventListener('click', closeLoginModal);
  }

  if (loginModal) {
    loginModal.addEventListener('click', (event) => {
      if (event.target === loginModal) {
        closeLoginModal();
      }
    });
  }

  if (demoLoginButton) {
    demoLoginButton.addEventListener('click', () => {
      localStorage.setItem('rubricheckDemoLoggedIn', 'true');
      showLoggedInState();
      closeLoginModal();
    });
  }

  const demoLogoutButton = document.querySelector('[data-demo-logout]');

  if (demoLogoutButton) {
    demoLogoutButton.addEventListener('click', showLoggedOutState);
  }

  function setCardFile(card, fileName, fileType) {
    const fileNameElement = card.querySelector('[data-file-name]');
    const fileTypeElement = card.querySelector('[data-file-type]');

    card.classList.add('is-uploaded');
    card.dataset.hasFile = 'true';

    if (fileNameElement) {
      fileNameElement.textContent = fileName;
    }

    if (fileTypeElement) {
      fileTypeElement.textContent = fileType;
    }
  }

  function removeCardFile(card) {
    const fileInput = card.querySelector('[data-file-input]');

    card.classList.remove('is-uploaded');
    card.dataset.hasFile = 'false';

    if (fileInput) {
      fileInput.value = '';
    }
  }

  function updateAnalyseButton() {
    if (!analyseButton || uploadCards.length === 0) {
      return;
    }

    const allFilesReady = Array.from(uploadCards).every((card) => card.dataset.hasFile === 'true');
    analyseButton.disabled = !allFilesReady;

    if (uploadNote) {
      uploadNote.textContent = allFilesReady
        ? 'All three files are ready for AI analysis.'
        : 'All three files are required before AI analysis can begin.';
    }
  }

  uploadCards.forEach((card) => {
    const fileInput = card.querySelector('[data-file-input]');
    const removeButton = card.querySelector('[data-remove-file]');

    if (!card.dataset.hasFile) {
      card.dataset.hasFile = card.classList.contains('is-uploaded') ? 'true' : 'false';
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length === 0) {
          return;
        }

        const selectedFile = fileInput.files[0];
        const fileExtension = selectedFile.name.split('.').pop().toUpperCase();
        let fileLabel = 'Student draft uploaded';

        if (card.dataset.fileKey === 'rubric') {
          fileLabel = 'Marking rubric uploaded';
        }

        if (card.dataset.fileKey === 'brief') {
          fileLabel = 'Assignment brief uploaded';
        }

        const fileType = `${fileLabel} - ${fileExtension}`;

        setCardFile(card, selectedFile.name, fileType);
        updateAnalyseButton();
      });
    }

    if (removeButton) {
      removeButton.addEventListener('click', () => {
        removeCardFile(card);
        updateAnalyseButton();
      });
    }
  });

  if (loadDemoFilesButton) {
    loadDemoFilesButton.addEventListener('click', () => {
      uploadCards.forEach((card) => {
        setCardFile(card, card.dataset.demoFile, card.dataset.demoType);
      });

      updateAnalyseButton();
    });
  }

  updateAnalyseButton();

  if (uploadForm && analyseButton) {
    uploadForm.addEventListener('submit', () => {
      analyseButton.disabled = true;
      analyseButton.textContent = 'Checking your assignment...';

      if (uploadNote) {
        uploadNote.textContent = 'Please wait while Gemini analyses the uploaded documents.';
      }
    });
  }

  if (analysisProgress && analysisPercent && analysisSteps.length > 0) {
    let progress = 17;
    let activeStepIndex = 1;

    const progressTimer = window.setInterval(() => {
      progress = Math.min(progress + 7, 100);
      analysisProgress.style.width = `${progress}%`;
      analysisPercent.textContent = `${progress}% complete`;

      const nextStepIndex = Math.min(Math.floor(progress / 18), analysisSteps.length - 1);

      if (nextStepIndex !== activeStepIndex) {
        analysisSteps.forEach((step, index) => {
          step.classList.toggle('completed', index < nextStepIndex);
          step.classList.toggle('active', index === nextStepIndex);
        });

        activeStepIndex = nextStepIndex;
      }
    }, 320);

    window.setTimeout(() => {
      window.clearInterval(progressTimer);
      window.location.href = '/feedback';
    }, 4000);
  }

  reportTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const selectedPanel = tab.dataset.reportTab;

      reportTabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-selected', String(isActive));
      });

      reportPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.reportPanel === selectedPanel);
      });
    });
  });

  downloadChecklistButtons.forEach((button) => {
    button.addEventListener('click', () => {
      window.alert('Checklist download will be available in the full version.');
    });
  });

  const regeneratedQuestions = [
    { tag: 'Analysis', level: 'Medium', text: 'Which part of your analysis most strongly supports your final recommendation?' },
    { tag: 'Rubric', level: 'Hard', text: 'Which rubric criterion was the most challenging to meet, and how did you address it?' },
    { tag: 'Evidence', level: 'Medium', text: 'How reliable is the evidence you used to support your findings?' },
    { tag: 'Reflection', level: 'Easy', text: 'What did you learn from reviewing the gaps in your first draft?' },
    { tag: 'Improvement', level: 'Medium', text: 'What specific change would improve your explanation depth the most?' },
    { tag: 'Conclusion', level: 'Hard', text: 'How would you defend your conclusion if a lecturer challenged your assumptions?' }
  ];

  if (regenerateQuestionsButton && questionList) {
    regenerateQuestionsButton.addEventListener('click', () => {
      questionList.innerHTML = regeneratedQuestions.map((question, index) => `
        <article class="question-card">
          <span class="question-number">${index + 1}</span>
          <div>
            <div class="question-meta">
              <span>${question.tag}</span>
              <em>${question.level}</em>
            </div>
            <h2>${question.text}</h2>
          </div>
        </article>
      `).join('');

      if (questionCount) {
        questionCount.textContent = String(regeneratedQuestions.length);
      }

      window.alert('New demo questions generated.');
    });
  }
});
