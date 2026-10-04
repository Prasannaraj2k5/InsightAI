/**
 * Main Application Logic for InsightAI Dashboard
 */
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentTab: 'tab-upload',
    currentUser: {
      name: 'Prasanna Raj',
      email: 'prasanna@insightai.io',
      role: 'Enterprise Admin',
      avatar: 'PR',
      plan: 'Pro'
    },
    activeFile: null,
    activeParsedData: null,
    activeAnalysis: null,
    lastDocumentText: '',
    history: []
  };

  // DOM Elements
  const tabItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const loaderOverlay = document.getElementById('loaderOverlay');
  const loaderText = document.getElementById('loaderText');
  const statusIndicator = document.getElementById('statusIndicator');

  // Top nav elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const userProfileBtn = document.getElementById('userProfileBtn');
  const navUserName = document.getElementById('navUserName');
  const navUserAvatar = document.getElementById('navUserAvatar');
  const navUserPlan = document.getElementById('navUserPlan');
  const btnExportReport = document.getElementById('btnExportReport');
  const btnExportAtsBrief = document.getElementById('btnExportAtsBrief');
  const btnBrandHome = document.getElementById('btnBrandHome');

  // Auth Modal Elements
  const authModal = document.getElementById('authModal');
  const btnAuthClose = document.getElementById('btnAuthClose');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const btnGuestLogin = document.getElementById('btnGuestLogin');

  // KPI elements
  const kpiFileName = document.getElementById('kpiFileName');
  const kpiFileSize = document.getElementById('kpiFileSize');
  const kpiLatency = document.getElementById('kpiLatency');
  const kpiQuality = document.getElementById('kpiQuality');
  const historyCountBadge = document.getElementById('historyCountBadge');

  // Initialize all subsystems
  initNavigation();
  initTheme();
  initAuth();
  initDragAndDrop();
  initSampleButtons();
  initQAEngine();
  initSpreadsheetSearch();
  initExport();
  fetchHistory();
  checkHealth();

  // Load sample dataset by default on startup
  loadSampleWorkflow('financial');

  // 1. Navigation & Tab Switching
  function initNavigation() {
    tabItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    if (btnBrandHome) {
      btnBrandHome.addEventListener('click', () => switchTab('tab-upload'));
    }
  }

  function switchTab(tabId) {
    state.currentTab = tabId;
    tabItems.forEach(i => i.classList.toggle('active', i.getAttribute('data-tab') === tabId));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));
    if (tabId === 'tab-history') {
      fetchHistory();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 2. Theme Toggle (Dark / Light)
  function initTheme() {
    const savedTheme = localStorage.getItem('insightai_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('insightai_theme', next);
      });
    }
  }

  // 3. User Authentication & Profile
  function initAuth() {
    // Check saved session
    const savedUser = localStorage.getItem('insightai_user');
    if (savedUser) {
      try {
        state.currentUser = JSON.parse(savedUser);
        updateUserUI();
      } catch (e) {
        console.error(e);
      }
    }

    if (userProfileBtn) {
      userProfileBtn.addEventListener('click', () => {
        authModal.classList.add('active');
      });
    }

    if (btnAuthClose) {
      btnAuthClose.addEventListener('click', () => {
        authModal.classList.remove('active');
      });
    }

    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) authModal.classList.remove('active');
    });

    if (tabLoginBtn && tabRegisterBtn) {
      tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
      });

      tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        registerForm.style.display = 'flex';
        loginForm.style.display = 'none';
      });
    }

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        showLoader('Signing in...');
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (data.success) {
            state.currentUser = data.user;
            localStorage.setItem('insightai_user', JSON.stringify(data.user));
            updateUserUI();
            authModal.classList.remove('active');
          } else {
            alert(data.error || 'Authentication failed');
          }
        } catch (err) {
          console.error(err);
        } finally {
          hideLoader();
        }
      });
    }

    // Register Form Submit
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        showLoader('Creating account...');
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
          });
          const data = await res.json();
          if (data.success) {
            state.currentUser = data.user;
            localStorage.setItem('insightai_user', JSON.stringify(data.user));
            updateUserUI();
            authModal.classList.remove('active');
          } else {
            alert(data.error || 'Registration failed');
          }
        } catch (err) {
          console.error(err);
        } finally {
          hideLoader();
        }
      });
    }

    // Guest Demo Login
    if (btnGuestLogin) {
      btnGuestLogin.addEventListener('click', () => {
        state.currentUser = {
          name: 'Demo Analyst',
          email: 'demo@insightai.io',
          role: 'Product Specialist',
          avatar: 'DA',
          plan: 'Demo Pro'
        };
        localStorage.setItem('insightai_user', JSON.stringify(state.currentUser));
        updateUserUI();
        authModal.classList.remove('active');
      });
    }
  }

  function updateUserUI() {
    if (navUserName) navUserName.textContent = state.currentUser.name;
    if (navUserAvatar) navUserAvatar.textContent = state.currentUser.avatar;
    if (navUserPlan) navUserPlan.textContent = state.currentUser.plan;
  }

  // 4. Drag & Drop File Upload
  function initDragAndDrop() {
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt.files && dt.files[0]) {
        handleFileUpload(dt.files[0]);
      }
    });
  }

  async function handleFileUpload(file) {
    showLoader(`Parsing and analyzing ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const jd = document.getElementById('customJDInput')?.value || '';
      if (jd) formData.append('jobDescription', jd);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to analyze file');
      }

      const result = await response.json();
      processAnalysisResult(result);
      fetchHistory();
    } catch (err) {
      alert(`Error analyzing file: ${err.message}`);
      console.error(err);
    } finally {
      hideLoader();
    }
  }

  // 5. Process & Route Analysis Results
  function processAnalysisResult(result) {
    state.activeFile = result.file;
    state.activeParsedData = result.parsed;
    state.activeAnalysis = result.analysis;

    // Update Global KPIs
    if (kpiFileName) kpiFileName.textContent = result.file.filename;
    if (kpiFileSize) kpiFileSize.textContent = `${result.file.sizeFormatted} • Clean Ingestion`;
    if (kpiLatency) kpiLatency.textContent = `${result.file.processingTimeMs} ms`;

    if (result.analysis.kind === 'tabular') {
      const profiler = result.analysis.profiler;
      if (kpiQuality) kpiQuality.textContent = `${profiler.dataQualityScore}%`;
      renderTabularDashboard(result.parsed, profiler);
      switchTab('tab-data');
    } else if (result.analysis.kind === 'resume') {
      const resume = result.analysis.resume;
      state.lastDocumentText = result.parsed.text;
      if (kpiQuality) kpiQuality.textContent = `${resume.atsScorecard.overallScore}% ATS`;
      renderResumeDashboard(resume);
      renderDocumentDashboard(result.analysis.nlp, result.parsed.text);
      switchTab('tab-resume');
    } else {
      // Document
      state.lastDocumentText = result.parsed.text;
      const nlp = result.analysis.nlp;
      if (kpiQuality) kpiQuality.textContent = `${nlp.readability.score} Readability`;
      renderDocumentDashboard(nlp, result.parsed.text);
      switchTab('tab-docs');
    }
  }

  // 6. Render Tabular BI Dashboard
  function renderTabularDashboard(parsed, profiler) {
    const rowEl = document.getElementById('dataTotalRows');
    const colEl = document.getElementById('dataTotalCols');
    const qualEl = document.getElementById('dataQualityScore');
    const compEl = document.getElementById('dataCompleteness');

    if (rowEl) rowEl.textContent = profiler.rowCount.toLocaleString();
    if (colEl) colEl.textContent = profiler.columnCount;
    if (qualEl) qualEl.textContent = `${profiler.dataQualityScore}%`;
    if (compEl) compEl.textContent = `${profiler.completenessPercent}%`;

    // Data Dictionary Table
    const dictBody = document.getElementById('dataDictionaryBody');
    if (dictBody) {
      dictBody.innerHTML = profiler.columns.map(col => {
        const cp = profiler.columnProfiles[col];
        let statSnippet = 'N/A';
        if (cp.stats) {
          if (cp.type === 'number') {
            statSnippet = `Mean: ${cp.stats.mean} | Min: ${cp.stats.min} | Max: ${cp.stats.max}`;
          } else if (cp.stats.topValues) {
            statSnippet = `Top: ${cp.stats.topValues.slice(0, 2).map(v => v.value).join(', ')}`;
          } else if (cp.stats.earliest) {
            statSnippet = `${cp.stats.earliest} to ${cp.stats.latest}`;
          }
        }
        return `
          <tr>
            <td><strong>${col}</strong></td>
            <td><span class="chip ${cp.type === 'number' ? 'chip-cyan' : cp.type === 'date' ? 'chip-amber' : 'chip-primary'}">${cp.type}</span></td>
            <td>${cp.uniqueCount} (${cp.distinctPercentage}%)</td>
            <td>${cp.nullCount} (${cp.missingPercentage}%)</td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${statSnippet}</td>
          </tr>
        `;
      }).join('');
    }

    // Spreadsheet Preview Table
    renderSpreadsheetPreview(parsed.preview);

    // Render Charts
    if (profiler.charts && profiler.charts.length > 0) {
      if (profiler.charts[0]) {
        document.getElementById('chart1Title').textContent = profiler.charts[0].title;
        window.ChartManager.render('chartCanvas1', profiler.charts[0]);
      }
      if (profiler.charts[1]) {
        document.getElementById('chart2Title').textContent = profiler.charts[1].title;
        window.ChartManager.render('chartCanvas2', profiler.charts[1]);
      } else if (profiler.charts[0]) {
        window.ChartManager.render('chartCanvas2', { ...profiler.charts[0], type: 'bar' });
      }
    }
  }

  function renderSpreadsheetPreview(rows, filterQuery = '') {
    const previewContainer = document.getElementById('spreadsheetPreview');
    if (!previewContainer || !rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    let filtered = rows;

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      filtered = rows.filter(r => Object.values(r).some(val => String(val).toLowerCase().includes(q)));
    }

    let html = '<table class="data-table"><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';

    filtered.slice(0, 20).forEach(row => {
      html += '<tr>';
      headers.forEach(h => {
        const val = row[h];
        html += `<td>${val !== null && val !== undefined ? val : '<span style="color:var(--text-muted)">null</span>'}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    if (filtered.length === 0) {
      html = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No records match your search filter.</div>';
    }

    previewContainer.innerHTML = html;
  }

  function initSpreadsheetSearch() {
    const searchInput = document.getElementById('spreadsheetSearchInput');
    const exportCsvBtn = document.getElementById('btnExportCsvPreview');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (state.activeParsedData && state.activeParsedData.preview) {
          renderSpreadsheetPreview(state.activeParsedData.preview, e.target.value);
        }
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        if (!state.activeParsedData || !state.activeParsedData.data) {
          alert('No tabular dataset loaded to export.');
          return;
        }
        const data = state.activeParsedData.data;
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach(row => {
          csvRows.push(headers.map(h => JSON.stringify(row[h] || '')).join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exported_${state.activeFile?.filename || 'dataset.csv'}`;
        a.click();
      });
    }
  }

  // 7. Render Resume Screening & ATS Scorecard
  function renderResumeDashboard(resume) {
    const candidate = resume.candidate;
    const ats = resume.atsScorecard;

    document.getElementById('resCandidateName').textContent = candidate.name;
    document.getElementById('resCandidateEmail').textContent = candidate.email;
    document.getElementById('resCandidatePhone').textContent = candidate.phone;
    document.getElementById('resCandidateLocation').textContent = candidate.location;

    // ATS Gauge
    const scoreNum = document.getElementById('resAtsScore');
    const scoreGrade = document.getElementById('resAtsGrade');
    const scoreCircle = document.getElementById('atsScoreCircle');

    if (scoreNum) scoreNum.textContent = ats.overallScore;
    if (scoreGrade) scoreGrade.textContent = ats.matchGrade;
    if (scoreCircle) {
      scoreCircle.style.setProperty('--score-angle', `${ats.overallScore}%`);
    }

    // Breakdown bars
    document.getElementById('subScoreTech').textContent = `${ats.breakdown.technicalSkillMatch}%`;
    document.getElementById('barTech').style.width = `${ats.breakdown.technicalSkillMatch}%`;

    document.getElementById('subScoreExp').textContent = `${ats.breakdown.experienceAlignment}%`;
    document.getElementById('barExp').style.width = `${ats.breakdown.experienceAlignment}%`;

    document.getElementById('subScoreEdu').textContent = `${ats.breakdown.educationScore}%`;
    document.getElementById('barEdu').style.width = `${ats.breakdown.educationScore}%`;

    document.getElementById('subScoreDiversity').textContent = `${ats.breakdown.skillDiversity}%`;
    document.getElementById('barDiversity').style.width = `${ats.breakdown.skillDiversity}%`;

    // Radar Chart
    if (resume.radarChart) {
      window.ChartManager.render('radarChartCanvas', resume.radarChart);
    }

    // Categorized Skills Chips
    const skillContainer = document.getElementById('resSkillsCategorized');
    if (skillContainer) {
      let chipsHtml = '';
      const catBadges = {
        languages: 'chip-primary',
        frameworks: 'chip-cyan',
        cloud_devops: 'chip-emerald',
        databases: 'chip-purple',
        ai_ml: 'chip-rose',
        soft_skills: 'chip-amber'
      };

      for (const [cat, list] of Object.entries(resume.categorizedSkills)) {
        if (list.length > 0) {
          chipsHtml += `<div style="margin-bottom: 0.75rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.35rem;">${cat.replace('_', ' ')}</div>
            <div class="chip-group">
              ${list.map(s => `<span class="chip ${catBadges[cat] || 'chip-primary'}">${s}</span>`).join('')}
            </div>
          </div>`;
        }
      }
      skillContainer.innerHTML = chipsHtml;
    }

    // Strengths & Missing Gaps
    const strengthEl = document.getElementById('resStrengthsList');
    if (strengthEl) {
      strengthEl.innerHTML = ats.strengths.map(s => `<li style="margin-bottom: 0.4rem; color: var(--accent-emerald);">✔ ${s}</li>`).join('');
    }

    const gapsEl = document.getElementById('resGapsList');
    if (gapsEl) {
      gapsEl.innerHTML = ats.missingSkills.length > 0
        ? ats.missingSkills.map(s => `<li style="margin-bottom: 0.4rem; color: var(--accent-amber);">⚠ Keyword to incorporate: <strong>${s}</strong></li>`).join('')
        : '<li style="color: var(--accent-emerald);">✔ 100% of target requisition skills detected!</li>';
    }
  }

  // 8. Render Document Intelligence Dashboard
  function renderDocumentDashboard(nlp, fullText) {
    document.getElementById('docSynopsis').textContent = nlp.summary || 'Summary unavailable.';

    // Key Takeaways
    const takeawaysList = document.getElementById('docTakeawaysList');
    if (takeawaysList) {
      takeawaysList.innerHTML = nlp.keyTakeaways.map(t => `<li style="margin-bottom: 0.5rem;">${t}</li>`).join('');
    }

    // Action Items
    const actionsList = document.getElementById('docActionItemsList');
    if (actionsList) {
      actionsList.innerHTML = nlp.actionItems.length > 0
        ? nlp.actionItems.map(a => `<li style="margin-bottom: 0.5rem; color: var(--accent-cyan);"><span style="color: #ffffff;">📋</span> ${a}</li>`).join('')
        : '<li style="color: var(--text-muted)">No explicit urgent action items detected.</li>';
    }

    // Quantitative Metrics Badges
    const metricsContainer = document.getElementById('docMetricsBadges');
    if (metricsContainer) {
      metricsContainer.innerHTML = nlp.metrics.map(m => `
        <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-emerald);">${m.value}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${m.context || m.type}</div>
        </div>
      `).join('');
    }

    // NER Chips
    const nerContainer = document.getElementById('docNerChips');
    if (nerContainer) {
      let nerHtml = '';
      const { organizations, technologies, dates, locations } = nlp.entities;
      if (organizations.length) nerHtml += organizations.map(o => `<span class="chip chip-primary">🏢 ${o}</span>`).join('');
      if (technologies.length) nerHtml += technologies.map(t => `<span class="chip chip-cyan">⚡ ${t}</span>`).join('');
      if (dates.length) nerHtml += dates.map(d => `<span class="chip chip-amber">📅 ${d}</span>`).join('');
      if (locations.length) nerHtml += locations.map(l => `<span class="chip chip-emerald">📍 ${l}</span>`).join('');
      nerContainer.innerHTML = nerHtml || '<span style="color:var(--text-muted)">No named entities detected.</span>';
    }

    // Sentiment & Readability
    document.getElementById('docSentimentLabel').textContent = `${nlp.sentiment.label} (${nlp.sentiment.tone})`;
    document.getElementById('docReadabilityScore').textContent = `${nlp.readability.score}/100 - ${nlp.readability.level}`;
    document.getElementById('docReadingTime').textContent = `~${nlp.readability.readingTimeMinutes} min read (${nlp.readability.wordCount} words)`;
  }

  // 9. Interactive Document Q&A & Suggested Chips
  function initQAEngine() {
    const askBtn = document.getElementById('btnAskDoc');
    const questionInput = document.getElementById('qaQuestionInput');
    const qaResponseCard = document.getElementById('qaResponseCard');
    const qaAnswerText = document.getElementById('qaAnswerText');
    const qaConfidenceBadge = document.getElementById('qaConfidenceBadge');
    const qaCitationsList = document.getElementById('qaCitationsList');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');

    if (!askBtn || !questionInput) return;

    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        questionInput.value = chip.getAttribute('data-q');
        runQA();
      });
    });

    askBtn.addEventListener('click', runQA);
    questionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runQA();
    });

    async function runQA() {
      const q = questionInput.value.trim();
      if (!q) return;

      if (!state.lastDocumentText) {
        alert('Please load or upload a document first before querying.');
        return;
      }

      askBtn.disabled = true;
      askBtn.textContent = 'Searching...';

      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentText: state.lastDocumentText,
            question: q
          })
        });

        const data = await res.json();
        if (data.success && data.result) {
          const r = data.result;
          qaResponseCard.classList.add('active');
          qaAnswerText.textContent = r.answer;
          qaConfidenceBadge.textContent = `${r.confidencePercent}% Confidence`;

          if (r.citations && r.citations.length > 0) {
            qaCitationsList.innerHTML = r.citations.map(c => `
              <div class="citation-box" style="margin-top: 0.5rem;">
                <strong>Source Excerpt #${c.citationId}:</strong> "${c.excerpt}"
              </div>
            `).join('');
          } else {
            qaCitationsList.innerHTML = '';
          }
        }
      } catch (err) {
        console.error('Q&A Error:', err);
      } finally {
        askBtn.disabled = false;
        askBtn.textContent = 'Ask InsightAI';
      }
    }
  }

  // 10. Document History Tray
  async function fetchHistory() {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        state.history = data.history || [];
        if (historyCountBadge) historyCountBadge.textContent = state.history.length;
        renderHistory();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderHistory() {
    const container = document.getElementById('historyGridContainer');
    if (!container) return;

    if (state.history.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted);">No documents processed yet. Drop any file to begin!</div>';
      return;
    }

    container.innerHTML = state.history.map(item => `
      <div class="history-card">
        <div class="history-top">
          <span class="chip ${item.type === 'spreadsheet' ? 'chip-cyan' : item.type === 'resume' ? 'chip-primary' : 'chip-amber'}">${item.type.toUpperCase()}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="history-title">${item.filename}</div>
        <div class="history-desc">${item.summary || 'Processed file.'}</div>
        <div class="history-footer">
          <span style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 700;">
            ${item.atsScore ? `${item.atsScore}% ATS Match` : item.qualityScore ? `${item.qualityScore}% Quality` : 'Processed'}
          </span>
          <button class="btn btn-secondary btn-sm" onclick="alert('Viewing archived analysis for ${item.filename}')">View</button>
        </div>
      </div>
    `).join('');
  }

  // 11. Sample Loader Buttons
  function initSampleButtons() {
    const sampleBtns = document.querySelectorAll('.sample-btn');
    sampleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sampleKey = btn.getAttribute('data-sample');
        loadSampleWorkflow(sampleKey);
      });
    });
  }

  async function loadSampleWorkflow(sampleKey) {
    showLoader(`Loading ${sampleKey} dataset sample...`);
    try {
      const sample = await window.SampleManager.fetchSample(sampleKey);
      const blob = new Blob([sample.content], { type: sample.type === 'spreadsheet' ? 'text/csv' : 'text/plain' });
      const file = new File([blob], sample.filename);

      await handleFileUpload(file);
    } catch (err) {
      console.error(err);
    } finally {
      hideLoader();
    }
  }

  // 12. Export & Print Executive Report
  function initExport() {
    if (btnExportReport) {
      btnExportReport.addEventListener('click', () => {
        window.print();
      });
    }

    if (btnExportAtsBrief) {
      btnExportAtsBrief.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // 13. System Health Poller
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (statusIndicator) {
          statusIndicator.innerHTML = `<span class="status-dot"></span> System Ready (v${data.version})`;
        }
      }
    } catch {
      if (statusIndicator) {
        statusIndicator.innerHTML = `<span class="status-dot" style="background:#f43f5e; box-shadow:0 0 8px #f43f5e;"></span> Offline`;
      }
    }
  }

  // UI Loader helpers
  function showLoader(msg = 'Processing...') {
    if (loaderText) loaderText.textContent = msg;
    if (loaderOverlay) loaderOverlay.classList.add('active');
  }

  function hideLoader() {
    if (loaderOverlay) loaderOverlay.classList.remove('active');
  }
});
