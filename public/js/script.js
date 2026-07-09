// RubriCheck frontend configuration.
// Future AI integration point: add the backend AI analysis endpoint here later.
const AI_ANALYSIS_API_URL = "";

// Future n8n webhook integration point: add the n8n reminder webhook URL here later.
const N8N_WEBHOOK_URL = "";

const DEMO_UPLOAD_FILES = {
  brief: {
    fileName: "Business_Analytics_Brief.pdf",
    fileType: "Assignment brief uploaded"
  },
  rubric: {
    fileName: "Business_Analytics_Rubric.pdf",
    fileType: "Marking rubric uploaded"
  },
  draft: {
    fileName: "Business_Analytics_Report.docx",
    fileType: "Student draft uploaded"
  }
};

const frontendState = {
  selectedFiles: {
    brief: null,
    rubric: null,
    draft: null
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  const currentPath = window.location.pathname;
  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  const uploadForm = document.querySelector("[data-upload-form]");
  const uploadCards = document.querySelectorAll("[data-upload-card]");
  const studentInfoFields = document.querySelectorAll("[data-student-info-required]");
  const loadDemoFilesButton = document.querySelector("[data-load-demo-files]");
  const analyseButton = document.querySelector("[data-analyse-button]");
  const uploadNote = document.querySelector("[data-upload-note]");
  const analysisLoadingOverlay = document.querySelector("[data-analysis-loading]");
  const analysisProgress = document.querySelector("[data-analysis-progress]");
  const analysisPercent = document.querySelector("[data-analysis-percent]");
  const analysisSteps = document.querySelectorAll("[data-analysis-steps] .analysis-step");
  const reportTabs = document.querySelectorAll("[data-report-tab]");
  const reportPanels = document.querySelectorAll("[data-report-panel]");
  const downloadChecklistButtons = document.querySelectorAll("[data-download-checklist]");
  const followUpForm = document.querySelector("[data-follow-up-form]");
  const followUpSubmit = document.querySelector("[data-follow-up-submit]");
  const followUpAnswer = document.querySelector("[data-follow-up-answer]");
  const followUpSampleAnswer = document.querySelector(".sample-answer");
  const followUpError = document.querySelector("[data-follow-up-error]");
  const reminderForm = document.querySelector("[data-reminder-form]");
  const reminderSuccess = document.querySelector("[data-reminder-success]");
  const reminderError = document.querySelector("[data-reminder-error]");

  navLinks.forEach((link) => {
    const linkTarget = link.getAttribute("href") || "";

    if (linkTarget === currentPath) {
      link.classList.add("active");
    }
  });

  if (revealElements.length > 0) {
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.16 });

      revealElements.forEach((element) => revealObserver.observe(element));
    } else {
      revealElements.forEach((element) => element.classList.add("is-visible"));
    }
  }

  function setCardFile(card, fileName, fileType) {
    const fileNameElement = card.querySelector("[data-file-name]");
    const fileTypeElement = card.querySelector("[data-file-type]");
    const fileKey = card.dataset.fileKey;

    card.classList.add("is-uploaded");
    card.dataset.hasFile = "true";
    frontendState.selectedFiles[fileKey] = { fileName, fileType };

    if (fileNameElement) {
      fileNameElement.textContent = fileName;
    }

    if (fileTypeElement) {
      fileTypeElement.textContent = fileType;
    }
  }

  function removeCardFile(card) {
    const fileInput = card.querySelector("[data-file-input]");
    const fileKey = card.dataset.fileKey;

    card.classList.remove("is-uploaded");
    card.dataset.hasFile = "false";
    frontendState.selectedFiles[fileKey] = null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function updateStudentFieldValidation(showErrors = false) {
    let allStudentFieldsReady = true;

    studentInfoFields.forEach((field) => {
      const isEmpty = field.value.trim() === "";
      const shouldShowError = showErrors || field.dataset.touched === "true";
      const fieldWrapper = field.closest(".form-field");
      const errorMessage = fieldWrapper ? fieldWrapper.querySelector("[data-field-error]") : null;

      if (isEmpty) {
        allStudentFieldsReady = false;
      }

      field.classList.toggle("has-error", isEmpty && shouldShowError);

      if (errorMessage) {
        errorMessage.classList.toggle("hidden", !(isEmpty && shouldShowError));
      }
    });

    return allStudentFieldsReady;
  }

  function updateAnalyseButton() {
    if (!analyseButton || uploadCards.length === 0) {
      return;
    }

    const allFilesReady = Array.from(uploadCards).every((card) => card.dataset.hasFile === "true");
    const allStudentFieldsReady = updateStudentFieldValidation(false);
    analyseButton.disabled = !(allStudentFieldsReady && allFilesReady);

    if (uploadNote) {
      if (!allStudentFieldsReady && !allFilesReady) {
        uploadNote.textContent = "Student information and all three files are required before AI analysis can begin.";
      } else if (!allStudentFieldsReady) {
        uploadNote.textContent = "Please complete the student information before AI analysis can begin.";
      } else if (!allFilesReady) {
        uploadNote.textContent = "All three files are required before AI analysis can begin.";
      } else {
        uploadNote.textContent = "Student information and all three files are ready for AI analysis.";
      }
    }
  }

  studentInfoFields.forEach((field) => {
    field.addEventListener("input", () => {
      updateStudentFieldValidation(false);
      updateAnalyseButton();
    });

    field.addEventListener("blur", () => {
      field.dataset.touched = "true";
      updateStudentFieldValidation(false);
      updateAnalyseButton();
    });
  });

  uploadCards.forEach((card) => {
    const fileInput = card.querySelector("[data-file-input]");
    const removeButton = card.querySelector("[data-remove-file]");
    const fileKey = card.dataset.fileKey;

    card.dataset.hasFile = frontendState.selectedFiles[fileKey] ? "true" : "false";

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files.length === 0) {
          return;
        }

        const selectedFile = fileInput.files[0];
        const fileExtension = selectedFile.name.split(".").pop().toUpperCase();
        let fileLabel = "Student draft uploaded";

        if (fileKey === "rubric") {
          fileLabel = "Marking rubric uploaded";
        }

        if (fileKey === "brief") {
          fileLabel = "Assignment brief uploaded";
        }

        const fileType = `${fileLabel} - ${fileExtension}`;

        setCardFile(card, selectedFile.name, fileType);
        updateAnalyseButton();
      });
    }

    if (removeButton) {
      removeButton.addEventListener("click", () => {
        removeCardFile(card);
        updateAnalyseButton();
      });
    }
  });

  if (loadDemoFilesButton) {
    loadDemoFilesButton.addEventListener("click", () => {
      uploadCards.forEach((card) => {
        const demoFile = DEMO_UPLOAD_FILES[card.dataset.fileKey];

        if (demoFile) {
          setCardFile(card, demoFile.fileName, demoFile.fileType);
        }
      });

      updateAnalyseButton();
    });
  }

  if (uploadForm) {
    uploadForm.addEventListener("submit", (event) => {
      const allFilesReady = Object.values(frontendState.selectedFiles).every(Boolean);
      const allStudentFieldsReady = updateStudentFieldValidation(true);

      if (!allStudentFieldsReady || !allFilesReady) {
        event.preventDefault();
        updateAnalyseButton();
        return;
      }

      // Future backend integration point: send the selected files to the server here.
      // For now, the prototype keeps the file names in frontend state and continues.
    });
  }

  updateAnalyseButton();

  if (uploadForm && analyseButton) {
    uploadForm.addEventListener('submit', (event) => {
      if (event.defaultPrevented || analyseButton.disabled) {
        return;
      }

      analyseButton.disabled = true;
      analyseButton.textContent = 'Checking your assignment...';
      document.body.classList.add("is-analysis-loading");

      if (analysisLoadingOverlay) {
        analysisLoadingOverlay.classList.remove("hidden");
      }

      if (uploadNote) {
        uploadNote.textContent = 'Please wait while Gemini analyses the uploaded documents.';
      }
    });
  }

  if (analysisProgress && analysisPercent && analysisSteps.length > 0) {
    // Future AI integration point: call AI_ANALYSIS_API_URL here when the backend exists.
    // The simulated progress below keeps the frontend prototype usable for now.
    let progress = 17;
    let activeStepIndex = 1;

    const progressTimer = window.setInterval(() => {
      progress = Math.min(progress + 7, 100);
      analysisProgress.style.width = `${progress}%`;
      analysisPercent.textContent = `${progress}% complete`;

      const nextStepIndex = Math.min(Math.floor(progress / 18), analysisSteps.length - 1);

      if (nextStepIndex !== activeStepIndex) {
        analysisSteps.forEach((step, index) => {
          step.classList.toggle("completed", index < nextStepIndex);
          step.classList.toggle("active", index === nextStepIndex);
        });

        activeStepIndex = nextStepIndex;
      }
    }, 320);

    window.setTimeout(() => {
      window.clearInterval(progressTimer);
      window.location.href = "/check-assignment";
    }, 4000);
  }

  reportTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const selectedPanel = tab.dataset.reportTab;

      reportTabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      reportPanels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.reportPanel === selectedPanel);
      });
    });
  });

  downloadChecklistButtons.forEach((button) => {
    button.addEventListener("click", () => {
      window.alert("Checklist download will be available in the full version.");
    });
  });

  function showFollowUpMessage(type, message) {
    const isError = type === "error";

    if (followUpError) {
      followUpError.textContent = isError ? message : "";
      followUpError.classList.toggle("hidden", !isError);
    }

    if (followUpAnswer) {
      followUpAnswer.textContent = isError ? "" : message;
      followUpAnswer.classList.toggle("hidden", isError || !message);
    }

    if (followUpSampleAnswer) {
      followUpSampleAnswer.classList.toggle("hidden", !isError && Boolean(message));
    }
  }

  if (followUpForm) {
    followUpForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(followUpForm);
      const reviewId = String(formData.get("reviewId") || "");
      const question = String(formData.get("question") || "").trim();
      const defaultSubmitText = followUpSubmit ? followUpSubmit.textContent : "";

      if (!question) {
        showFollowUpMessage("error", "Please enter a follow-up question.");
        return;
      }

      if (followUpSubmit) {
        followUpSubmit.disabled = true;
        followUpSubmit.textContent = "Asking RubriCheck AI...";
      }

      showFollowUpMessage("answer", "Checking the uploaded documents and feedback report...");

      try {
        const response = await fetch("/check-assignment/follow-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ reviewId, question })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to answer the follow-up question. Please try again.");
        }

        showFollowUpMessage("answer", data.answer || "RubriCheck AI did not return an answer.");
      } catch (error) {
        showFollowUpMessage("error", error.message || "Unable to answer the follow-up question. Please try again.");
      } finally {
        if (followUpSubmit) {
          followUpSubmit.disabled = false;
          followUpSubmit.textContent = defaultSubmitText || "Send";
        }
      }
    });
  }

  function showReminderMessage(type, message) {
    const isSuccess = type === "success";

    if (reminderSuccess) {
      reminderSuccess.textContent = message;
      reminderSuccess.classList.toggle("hidden", !isSuccess);
    }

    if (reminderError) {
      reminderError.textContent = message;
      reminderError.classList.toggle("hidden", isSuccess);
    }
  }

  function getReminderFormData(form) {
    const formData = new FormData(form);
    const reminderData = {};

    formData.forEach((value, key) => {
      reminderData[key] = String(value).trim();
    });

    return reminderData;
  }

  if (reminderForm) {
    reminderForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const requiredReminderFields = reminderForm.querySelectorAll("[data-reminder-required]");
      const firstEmptyField = Array.from(requiredReminderFields).find((field) => field.value.trim() === "");

      if (firstEmptyField) {
        showReminderMessage("error", "Please complete all required reminder fields before saving.");
        firstEmptyField.focus();
        return;
      }

      const reminderData = getReminderFormData(reminderForm);

      if (N8N_WEBHOOK_URL.trim() === "") {
        showReminderMessage("success", "Reminder form is ready. Add the n8n webhook URL to connect automation.");
        return;
      }

      try {
        // Future n8n webhook integration point: this POST is ready once N8N_WEBHOOK_URL is set.
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(reminderData)
        });

        if (!response.ok) {
          throw new Error(`Webhook returned status ${response.status}`);
        }

        showReminderMessage("success", "Reminder sent successfully.");
      } catch (error) {
        showReminderMessage("error", "Reminder could not be sent. Please check the n8n webhook URL and try again.");
        console.error("Reminder webhook error:", error);
      }
    });
  }
});
