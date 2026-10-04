/**
 * Main Application Logic for InsightAI Dashboard (v2.5)
 * Includes all 9 Advanced Add-on Features:
 * - Feature 1: Multi-Candidate Batch Ranking Leaderboard
 * - Feature 3: Resume Bullet-Point Optimizer (Google X-Y-Z Formula)
 * - Feature 5: Natural Language "Ask Your Data" (Text-to-Chart)
 * - Feature 6: 1-Click Smart Data Cleaning & Hygiene Assistant
 * - Feature 9: Custom Pivot Table & Multi-Level Aggregator
 * - Feature 11: Contract Risk & Red-Flag Scanner
 * - Feature 15: Multi-Language Document Translation Simulator (Dual-Pane)
 * - Feature 17: Cloud Storage Direct Integrations (Drive / Dropbox / OneDrive)
 * - Feature 18: Shareable Read-Only Workspace Links
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

  // Modals
  const authModal = document.getElementById('authModal');
  const btnAuthClose = document.getElementById('btnAuthClose');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const btnGuestLogin = document.getElementById('btnGuestLogin');

  const leaderboardModal = document.getElementById('leaderboardModal');
  const btnOpenLeaderboardModal = document.getElementById('btnOpenLeaderboardModal');
  const btnLeaderboardClose = document.getElementById('btnLeaderboardClose');

  const cloudModal = document.getElementById('cloudModal');
  const btnCloudStorageModalOpen = document.getElementById('btnCloudStorageModalOpen');
  const btnCloudModalClose = document.getElementById('btnCloudModalClose');

  const shareModal = document.getElementById('shareModal');
  const btnShareModalOpen = document.getElementById('btnShareModalOpen');
  const btnShareModalClose = document.getElementById('btnShareModalClose');
  const btnCopyShareUrl = document.getElementById('btnCopyShareUrl');
  const shareUrlInput = document.getElementById('shareUrlInput');

  // KPI elements
  const kpiFileName = document.getElementById('kpiFileName');
  const kpiFileSize = document.getElementById('kpiFileSize');
  const kpiLatency = document.getElementById('kpiLatency');
  const kpiQuality = document.getElementById('kpiQuality');
  const historyCountBadge = document.getElementById('historyCountBadge');

  // Initialize
  initNavigation();
  initTheme();
  initAuth();
  initDragAndDrop();
  initSampleButtons();
  initQAEngine();
  initSpreadsheetSearch();
  initExport();
  initAddonFeatures();
  fetchHistory();
  checkHealth();

  // Load sample dataset on startup
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
    if (tabId === 'tab-history') fetchHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 2. Theme Toggle
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

  // 3. User Authentication
  function initAuth() {
    const savedUser = localStorage.getItem('insightai_user');
    if (savedUser) {
      try {
        state.currentUser = JSON.parse(savedUser);
        updateUserUI();
      } catch (e) {
        console.error(e);
      }
    }

    if (userProfileBtn) userProfileBtn.addEventListener('click', () => authModal.classList.add('open'));
    if (btnAuthClose) btnAuthClose.addEventListener('click', () => authModal.classList.remove('open'));
    authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.classList.remove('open'); });

    if (tabLoginBtn && tabRegisterBtn) {
      tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      });

      tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
      });
    }

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
            authModal.classList.remove('open');
            showToast('Welcome back, ' + data.user.name + '!', 'success');
          }
        } catch (err) {
          console.error(err);
          showToast('Sign in failed. Please try again.', 'error');
        } finally {
          hideLoader();
        }
      });
    }

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
            authModal.classList.remove('open');
            showToast('Account created! Welcome to InsightAI.', 'success');
          }
        } catch (err) {
          console.error(err);
          showToast('Registration failed. Please try again.', 'error');
        } finally {
          hideLoader();
        }
      });
    }

    const guestLoginHandler = () => {
      state.currentUser = {
        name: 'Demo Analyst',
        email: 'demo@insightai.io',
        role: 'Product Specialist',
        avatar: 'DA',
        plan: 'Demo'
      };
      localStorage.setItem('insightai_user', JSON.stringify(state.currentUser));
      updateUserUI();
      authModal.classList.remove('open');
      showToast('Signed in as Demo Analyst. Explore freely!', 'info');
    };

    if (btnGuestLogin) btnGuestLogin.addEventListener('click', guestLoginHandler);
    const btnGuestLoginReg = document.getElementById('btnGuestLoginReg');
    if (btnGuestLoginReg) btnGuestLoginReg.addEventListener('click', guestLoginHandler);
  }

  function updateUserUI() {
    if (navUserName) navUserName.textContent = state.currentUser.name;
    if (navUserAvatar) navUserAvatar.textContent = state.currentUser.avatar;
    if (navUserPlan) navUserPlan.textContent = state.currentUser.plan;
  }

  // 4. File Upload
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
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
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
      showToast(`Error: ${err.message}`, 'error');
      console.error(err);
    } finally {
      hideLoader();
    }
  }

  function processAnalysisResult(result) {
    state.activeFile = result.file;
    state.activeParsedData = result.parsed;
    state.activeAnalysis = result.analysis;

    if (kpiFileName) kpiFileName.textContent = result.file.filename;
    if (kpiFileSize) kpiFileSize.textContent = `${result.file.sizeFormatted} • Clean Ingestion`;
    if (kpiLatency) kpiLatency.textContent = `${result.file.processingTimeMs} ms`;

    if (result.analysis.kind === 'tabular') {
      const profiler = result.analysis.profiler;
      if (kpiQuality) kpiQuality.textContent = `${profiler.dataQualityScore}%`;
      renderTabularDashboard(result.parsed, profiler);
      populatePivotDropdowns(result.parsed.columns, profiler.columnProfiles);
      switchTab('tab-data');
    } else if (result.analysis.kind === 'resume') {
      const resume = result.analysis.resume;
      state.lastDocumentText = result.parsed.text;
      if (kpiQuality) kpiQuality.textContent = `${resume.atsScorecard.overallScore}% ATS`;
      renderResumeDashboard(resume);
      renderDocumentDashboard(result.analysis.nlp, result.parsed.text);
      switchTab('tab-resume');
    } else {
      state.lastDocumentText = result.parsed.text;
      const nlp = result.analysis.nlp;
      if (kpiQuality) kpiQuality.textContent = `${nlp.readability.score} Readability`;
      renderDocumentDashboard(nlp, result.parsed.text);
      switchTab('tab-docs');
    }
  }

  // 5. Render Tabular Dashboard
  function renderTabularDashboard(parsed, profiler) {
    const rowEl = document.getElementById('dataTotalRows');
    const colEl = document.getElementById('dataTotalCols');
    const qualEl = document.getElementById('dataQualityScore');
    const compEl = document.getElementById('dataCompleteness');

    if (rowEl) rowEl.textContent = profiler.rowCount.toLocaleString();
    if (colEl) colEl.textContent = profiler.columnCount;
    if (qualEl) qualEl.textContent = `${profiler.dataQualityScore}%`;
    if (compEl) compEl.textContent = `${profiler.completenessPercent}%`;

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
        const typeClass = cp.type === 'number' ? 'badge-cyan' : cp.type === 'date' ? 'badge-warning' : 'badge-info';
        return `
          <tr>
            <td><strong>${col}</strong></td>
            <td><span class="badge ${typeClass}">${cp.type}</span></td>
            <td>${cp.uniqueCount} (${cp.distinctPercentage}%)</td>
            <td>${cp.nullCount} (${cp.missingPercentage}%)</td>
            <td style="font-size: 0.78rem; color: var(--text-secondary);">${statSnippet}</td>
          </tr>
        `;
      }).join('');
    }

    renderSpreadsheetPreview(parsed.preview);

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

    let html = '<table class="table"><thead><tr>';
    headers.forEach(h => html += `<th scope="col">${h}</th>`);
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
          showToast('No tabular dataset loaded to export.', 'error');
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

  // 6. Render Resume Screening
  function renderResumeDashboard(resume) {
    const candidate = resume.candidate;
    const ats = resume.atsScorecard;

    document.getElementById('resCandidateName').textContent = candidate.name;
    document.getElementById('resCandidateEmail').textContent = candidate.email;
    document.getElementById('resCandidatePhone').textContent = candidate.phone;
    document.getElementById('resCandidateLocation').textContent = candidate.location;

    const scoreNum = document.getElementById('resAtsScore');
    const scoreGrade = document.getElementById('resAtsGrade');
    const scoreCircle = document.getElementById('atsScoreCircle');

    if (scoreNum) scoreNum.textContent = ats.overallScore;
    if (scoreGrade) scoreGrade.textContent = ats.matchGrade;
    if (scoreCircle) scoreCircle.style.setProperty('--pct', `${ats.overallScore}%`);

    document.getElementById('subScoreTech').textContent = `${ats.breakdown.technicalSkillMatch}%`;
    document.getElementById('barTech').style.width = `${ats.breakdown.technicalSkillMatch}%`;
    document.getElementById('subScoreExp').textContent = `${ats.breakdown.experienceAlignment}%`;
    document.getElementById('barExp').style.width = `${ats.breakdown.experienceAlignment}%`;
    document.getElementById('subScoreEdu').textContent = `${ats.breakdown.educationScore}%`;
    document.getElementById('barEdu').style.width = `${ats.breakdown.educationScore}%`;
    document.getElementById('subScoreDiversity').textContent = `${ats.breakdown.skillDiversity}%`;
    document.getElementById('barDiversity').style.width = `${ats.breakdown.skillDiversity}%`;

    if (resume.radarChart) window.ChartManager.render('radarChartCanvas', resume.radarChart);

    const skillContainer = document.getElementById('resSkillsCategorized');
    if (skillContainer) {
      let chipsHtml = '';
      const catBadges = {
        languages: 'badge-info',
        frameworks: 'badge-cyan',
        cloud_devops: 'badge-success',
        databases: 'badge-purple',
        ai_ml: 'badge-danger',
        soft_skills: 'badge-warning'
      };

      for (const [cat, list] of Object.entries(resume.categorizedSkills)) {
        if (list.length > 0) {
          chipsHtml += `<div style="margin-bottom: 0.75rem;">
            <div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:.07em;margin-bottom:.35rem;">${cat.replace('_', ' ')}</div>
            <div class="chip-row">
              ${list.map(s => `<span class="chip">${s}</span>`).join('')}
            </div>
          </div>`;
        }
      }
      skillContainer.innerHTML = chipsHtml;
    }

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

  // 7. Render Document Intelligence
  function renderDocumentDashboard(nlp, fullText) {
    document.getElementById('docSynopsis').textContent = nlp.summary || 'Summary unavailable.';

    const takeawaysList = document.getElementById('docTakeawaysList');
    if (takeawaysList) {
      takeawaysList.innerHTML = nlp.keyTakeaways.map(t => `<li style="margin-bottom: 0.5rem;">${t}</li>`).join('');
    }

    const actionsList = document.getElementById('docActionItemsList');
    if (actionsList) {
      actionsList.innerHTML = nlp.actionItems.length > 0
        ? nlp.actionItems.map(a => `<li style="margin-bottom: 0.5rem; color: var(--accent-cyan);"><span style="color: #ffffff;">📋</span> ${a}</li>`).join('')
        : '<li style="color: var(--text-muted)">No explicit urgent action items detected.</li>';
    }

    const metricsContainer = document.getElementById('docMetricsBadges');
    if (metricsContainer) {
      metricsContainer.innerHTML = nlp.metrics.map(m => `
        <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-emerald);">${m.value}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${m.context || m.type}</div>
        </div>
      `).join('');
    }

    const nerContainer = document.getElementById('docNerChips');
    if (nerContainer) {
      let nerHtml = '';
      const { organizations, technologies, dates, locations } = nlp.entities;
      if (organizations.length) nerHtml += organizations.map(o => `<span class="chip">🏢 ${o}</span>`).join('');
      if (technologies.length) nerHtml += technologies.map(t => `<span class="chip" style="border-color:rgba(34,211,238,0.2);color:var(--accent-cyan);">⚡ ${t}</span>`).join('');
      if (dates.length) nerHtml += dates.map(d => `<span class="chip" style="border-color:rgba(245,158,11,0.2);color:var(--accent-amber);">📅 ${d}</span>`).join('');
      if (locations.length) nerHtml += locations.map(l => `<span class="chip" style="border-color:rgba(16,185,129,0.2);color:var(--accent-emerald);">📍 ${l}</span>`).join('');
      nerContainer.innerHTML = nerHtml || '<span class="text-muted text-sm">No named entities detected.</span>';
    }

    document.getElementById('docSentimentLabel').textContent = `${nlp.sentiment.label} (${nlp.sentiment.tone})`;
    document.getElementById('docReadabilityScore').textContent = `${nlp.readability.score}/100 - ${nlp.readability.level}`;
    document.getElementById('docReadingTime').textContent = `~${nlp.readability.readingTimeMinutes} min read (${nlp.readability.wordCount} words)`;

    const transSrc = document.getElementById('transSourceText');
    if (transSrc) transSrc.textContent = fullText ? fullText.slice(0, 350) + '...' : 'Load document to preview translation.';
  }

  // 8. Q&A Engine
  function initQAEngine() {
    const askBtn = document.getElementById('btnAskDoc');
    const questionInput = document.getElementById('qaQuestionInput');
    const qaMessages = document.getElementById('qaMessages');
    const suggestionChips = document.querySelectorAll('.chip[data-q]');

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

    function addBubble(text, type) {
      if (!qaMessages) return;
      const bubble = document.createElement('div');
      bubble.className = `qa-bubble ${type}`;
      bubble.textContent = text;
      qaMessages.appendChild(bubble);
      qaMessages.scrollTop = qaMessages.scrollHeight;
    }

    async function runQA() {
      const q = questionInput.value.trim();
      if (!q) return;

      if (!state.lastDocumentText) {
        showToast('Please load a document first before querying.', 'info');
        return;
      }

      addBubble(q, 'user');
      questionInput.value = '';
      askBtn.disabled = true;
      askBtn.textContent = 'Thinking...';

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
          addBubble(r.answer, 'ai');
          if (r.citations && r.citations.length > 0) {
            addBubble(`Source: "${r.citations[0].excerpt}" (${r.confidencePercent}% confidence)`, 'ai');
          }
        } else {
          addBubble('I could not find a specific answer. Try rephrasing your question.', 'ai');
        }
      } catch (err) {
        addBubble('Connection error. Please try again.', 'ai');
        console.error('Q&A Error:', err);
      } finally {
        askBtn.disabled = false;
        askBtn.textContent = 'Ask InsightAI';
      }
    }
  }

  // 9. Document History Tray
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
      container.innerHTML = '<div style="grid-column:1/-1;padding:3rem;text-align:center;color:var(--text-muted);"><div style="font-size:2.5rem;margin-bottom:0.75rem;">📂</div><div>No documents processed yet. Drop any file to begin!</div></div>';
      return;
    }

    container.innerHTML = state.history.map(item => {
      const typeClass = item.type === 'spreadsheet' ? 'spreadsheet' : item.type === 'resume' ? 'resume' : 'document';
      const timeStr = new Date(item.timestamp).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const scoreStr = item.atsScore ? `${item.atsScore}% ATS Match` : item.qualityScore ? `${item.qualityScore}% Quality` : 'Processed';
      return `
      <div class="history-card" role="listitem">
        <div class="h-card-type ${typeClass}">${item.type.toUpperCase()}</div>
        <div class="h-card-name">${item.filename}</div>
        <div class="h-card-meta">${timeStr}</div>
        <div class="h-card-summary">${item.summary || 'Document processed successfully.'}</div>
        <div class="flex" style="justify-content:space-between;align-items:center;">
          <span class="badge badge-success">${scoreStr}</span>
          <button class="btn btn-secondary btn-xs" onclick="showToast('Loading archived analysis...', 'info')">View Archive</button>
        </div>
      </div>
    `}).join('');
  }

  // 10. Sample Loaders
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

  // 11. Export & Print
  function initExport() {
    if (btnExportReport) btnExportReport.addEventListener('click', () => window.print());
    if (btnExportAtsBrief) btnExportAtsBrief.addEventListener('click', () => window.print());
  }

  // 12. Check Health
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

  // =========================================================================
  // IMPLEMENTATION OF 9 ADD-ON FEATURES
  // =========================================================================
  function initAddonFeatures() {
    // -----------------------------------------------------------------------
    // FEATURE 1: Multi-Candidate Batch Ranking Leaderboard
    // -----------------------------------------------------------------------
    if (btnOpenLeaderboardModal) {
      btnOpenLeaderboardModal.addEventListener('click', async () => {
        leaderboardModal.classList.add('open');
        showLoader('Evaluating candidate pool for leaderboard...');
        try {
          const sampleCandidates = [
            {
              name: 'Prasanna Raj',
              resumeText: state.lastDocumentText && state.activeAnalysis?.kind === 'resume' ? state.lastDocumentText : `
PRASANNA RAJ - Senior AI & Full Stack Platform Engineer
Skills: Python, TypeScript, React, PyTorch, Docker, Kubernetes, AWS, PostgreSQL, REST APIs, NLP, RAG.
Experience: 6+ years designing scalable systems and document intelligence platforms.`
            },
            {
              name: 'Sarah Jenkins',
              resumeText: `SARAH JENKINS - Senior Data & Cloud Engineer
Skills: Python, SQL, AWS, Docker, Kubernetes, Spark, Kafka, Microservices.
Experience: 5 years building big data infrastructure and streaming pipelines.`
            },
            {
              name: 'David Chen',
              resumeText: `DAVID CHEN - Full-Stack Developer
Skills: JavaScript, Node.js, Express, HTML, CSS, React, MongoDB.
Experience: 3 years building web apps and front-end user portals.`
            }
          ];

          const res = await fetch('/api/analyze/batch-resumes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidates: sampleCandidates,
              jobDescription: document.getElementById('customJDInput')?.value || ''
            })
          });

          const data = await res.json();
          if (data.success && data.leaderboard) {
            renderLeaderboardTable(data.leaderboard);
          }
        } catch (err) {
          console.error(err);
        } finally {
          hideLoader();
        }
      });
    }

    if (btnLeaderboardClose) {
      btnLeaderboardClose.addEventListener('click', () => leaderboardModal.classList.remove('open'));
      leaderboardModal.addEventListener('click', (e) => { if (e.target === leaderboardModal) leaderboardModal.classList.remove('open'); });
    }

    function renderLeaderboardTable(rows) {
      const tbody = document.getElementById('leaderboardTableBody');
      if (!tbody) return;
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td><strong style="color:var(--accent-amber);font-size:1rem;">${r.badge}</strong></td>
          <td><strong>${r.name}</strong></td>
          <td>
            <span class="badge ${r.overallScore >= 85 ? 'badge-success' : r.overallScore >= 75 ? 'badge-info' : 'badge-warning'}">
              ${r.overallScore}%
            </span>
          </td>
          <td>
            <span class="badge ${r.statusTier === 'Fast-Track' ? 'badge-success' : 'badge-cyan'}">${r.statusTier}</span>
          </td>
          <td>
            <div class="chip-row">${r.topSkills.map(s => `<span class="chip" style="font-size:0.68rem;">${s}</span>`).join('')}</div>
          </td>
          <td>
            <button class="btn btn-primary btn-xs" onclick="showToast('${r.name} shortlisted for interview!', 'success')">Shortlist</button>
          </td>
        </tr>
      `).join('');
    }

    // -----------------------------------------------------------------------
    // FEATURE 3: Resume Bullet-Point Optimizer (Google X-Y-Z Formula)
    // -----------------------------------------------------------------------
    const btnRunBulletOptimizer = document.getElementById('btnRunBulletOptimizer');
    const bulletOptimizerResults = document.getElementById('bulletOptimizerResults');

    if (btnRunBulletOptimizer) {
      btnRunBulletOptimizer.addEventListener('click', async () => {
        const text = state.lastDocumentText || `
• Developed automated data ingestion pipelines for large Excel and CSV spreadsheets.
• Built reusable UI component libraries and responsive web applications.
• Optimized PostgreSQL query performance and indexed critical tables.`;

        showLoader('Generating Google X-Y-Z formula enhancements...');
        try {
          const res = await fetch('/api/analyze/resume-optimizer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText: text })
          });

          const data = await res.json();
          if (data.success && data.optimizations) {
            bulletOptimizerResults.innerHTML = data.optimizations.map(opt => `
              <div style="background: var(--bg-surface); padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 0.85rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                  <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Original Bullet #${opt.id}</span>
                  <span class="chip chip-emerald" style="font-size: 0.72rem;">${opt.scoreBoost}</span>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.6rem; text-decoration: line-through;">"${opt.original}"</div>
                <div style="font-size: 0.75rem; color: var(--accent-amber); margin-bottom: 0.4rem;">⚠ Diagnosis: ${opt.weakness}</div>
                <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--accent-emerald); padding: 0.65rem 0.85rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.875rem; color: var(--text-primary);">
                  <strong>✨ Google X-Y-Z Enhanced Rewrite:</strong><br>${opt.optimizedXYZ}
                </div>
              </div>
            `).join('');
          }
        } catch (err) {
          console.error(err);
        } finally {
          hideLoader();
        }
      });
    }

    // -----------------------------------------------------------------------
    // FEATURE 5: Natural Language "Ask Your Data" (Text-to-Chart)
    // -----------------------------------------------------------------------
    const btnRunNlQuery = document.getElementById('btnRunNlQuery');
    const nlQueryInput = document.getElementById('nlQueryInput');
    const nlQueryFeedback = document.getElementById('nlQueryFeedback');

    if (btnRunNlQuery && nlQueryInput) {
      btnRunNlQuery.addEventListener('click', runNlQuery);
      nlQueryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runNlQuery(); });

      async function runNlQuery() {
        const query = nlQueryInput.value.trim();
        if (!query) return;

        if (!state.activeParsedData || !state.activeParsedData.data) {
          alert('Please load a tabular dataset first.');
          return;
        }

        btnRunNlQuery.disabled = true;
        btnRunNlQuery.textContent = 'Generating...';

        try {
          const res = await fetch('/api/data/nl-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              data: state.activeParsedData.data
            })
          });

          const data = await res.json();
          if (data.success && data.chart) {
            document.getElementById('chart1Title').textContent = `✨ AI Generated: ${data.chart.title}`;
            window.ChartManager.render('chartCanvas1', data.chart);
            if (nlQueryFeedback) {
              nlQueryFeedback.innerHTML = `<span style="color: var(--accent-emerald);">✔ ${data.summaryText}</span>`;
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnRunNlQuery.disabled = false;
          btnRunNlQuery.textContent = 'Generate Chart';
        }
      }
    }

    // -----------------------------------------------------------------------
    // FEATURE 6: 1-Click Smart Data Cleaning & Hygiene Assistant
    // -----------------------------------------------------------------------
    const btnSmartCleanData = document.getElementById('btnSmartCleanData');
    if (btnSmartCleanData) {
      btnSmartCleanData.addEventListener('click', async () => {
        if (!state.activeParsedData || !state.activeParsedData.data) {
          showToast('No tabular data loaded. Upload a spreadsheet first.', 'error');
          return;
        }

        showLoader('Running smart data hygiene audit and cleanup...');
        try {
          const res = await fetch('/api/data/clean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: state.activeParsedData.data })
          });

          const result = await res.json();
          if (result.success) {
            state.activeParsedData.data = result.cleanedData;
            state.activeParsedData.preview = result.cleanedData.slice(0, 30);
            renderSpreadsheetPreview(state.activeParsedData.preview);
            showToast(`Data cleaned! ${result.hygieneReport.duplicatesRemoved} duplicates removed, ${result.hygieneReport.nullsImputed} nulls imputed.`, 'success');
          }
        } catch (err) {
          console.error(err);
          showToast('Data cleaning failed.', 'error');
        } finally {
          hideLoader();
        }
      });
    }

    // -----------------------------------------------------------------------
    // FEATURE 9: Custom Pivot Table & Multi-Level Aggregator
    // -----------------------------------------------------------------------
    const btnComputePivot = document.getElementById('btnComputePivot');
    if (btnComputePivot) {
      btnComputePivot.addEventListener('click', async () => {
        if (!state.activeParsedData || !state.activeParsedData.data) {
          showToast('Load a tabular dataset first.', 'error');
          return;
        }

        const rowDimension = document.getElementById('pivotDimensionSelect').value;
        const metricField = document.getElementById('pivotMetricSelect').value;
        const aggregation = document.getElementById('pivotAggSelect').value;

        showLoader('Computing multi-level pivot aggregation...');
        try {
          const res = await fetch('/api/data/pivot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: state.activeParsedData.data,
              rowDimension,
              metricField,
              aggregation
            })
          });

          const data = await res.json();
          if (data.success && data.pivotRows) {
            renderPivotTable(data.pivotRows, rowDimension, metricField, aggregation);
          }
        } catch (err) {
          console.error(err);
        } finally {
          hideLoader();
        }
      });
    }

    function renderPivotTable(rows, dim, metric, agg) {
      const container = document.getElementById('pivotResultsContainer');
      if (!container || rows.length === 0) return;

      let html = `<table class="table"><thead><tr>
        <th scope="col">${dim}</th>
        <th scope="col">Records</th>
        <th scope="col">Total Sum</th>
        <th scope="col">Average</th>
        <th scope="col">${agg.toUpperCase()} (${metric})</th>
      </tr></thead><tbody>`;

      rows.forEach(r => {
        html += `<tr>
          <td><strong>${r[dim]}</strong></td>
          <td>${r.RecordCount}</td>
          <td>$${r.TotalSum.toLocaleString()}</td>
          <td>$${r.Average.toLocaleString()}</td>
          <td><strong style="color:var(--accent-emerald);">$${r.CalculatedValue.toLocaleString()}</strong></td>
        </tr>`;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
      showToast(`Pivot table computed: ${rows.length} groups found.`, 'success');
    }

    // -----------------------------------------------------------------------
    // FEATURE 11: Contract Risk & Red-Flag Scanner
    // -----------------------------------------------------------------------
    const btnScanContractRisks = document.getElementById('btnScanContractRisks');
    const contractRiskResults = document.getElementById('contractRiskResults');

    if (btnScanContractRisks) {
      btnScanContractRisks.addEventListener('click', async () => {
        const text = state.lastDocumentText || `
Nexus Enterprises Master Services Agreement.
The vendor shall provide unlimited liability and indemnify and hold harmless the client in its sole discretion.
This agreement shall automatically renew for a subsequent term unless written notice of non-renewal is given 120 days prior to expiration.
Early termination fee shall accelerate all remaining payments.`;

        showLoader('Scanning document for high-risk legal clauses...');
        try {
          const res = await fetch('/api/analyze/contract-risks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          });

          const data = await res.json();
          if (data.success) {
            contractRiskResults.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; background: var(--bg-surface); padding: 0.85rem 1.25rem; border-radius: var(--radius-md);">
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Overall Document Risk Index</div>
                  <div style="font-size: 1.4rem; font-weight: 800; color: ${data.riskScore >= 60 ? 'var(--accent-rose)' : 'var(--accent-amber)'};">${data.riskScore}/100 — ${data.riskLevel}</div>
                </div>
                <span class="chip chip-rose">${data.detectedCount} Red Flags Detected</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${data.risks.map(r => `
                  <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-sm); border-left: 3px solid ${r.severity === 'HIGH' ? 'var(--accent-rose)' : 'var(--accent-amber)'};">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                      <strong style="color: var(--text-primary); font-size: 0.95rem;">${r.category}</strong>
                      <span class="chip ${r.severity === 'HIGH' ? 'chip-rose' : 'chip-amber'}" style="font-size: 0.7rem;">${r.severity} SEVERITY</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">Triggered by: <em>"${r.triggers.join(', ')}"</em></div>
                    <div style="font-size: 0.825rem; color: var(--accent-emerald);"><strong>Mitigation Recommendation:</strong> ${r.recommendation}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
        } catch (err) {
          console.error(err);
        } finally {
          hideLoader();
        }
      });
    }

    // -----------------------------------------------------------------------
    // FEATURE 15: Multi-Language Document Translation Simulator (Dual-Pane)
    // -----------------------------------------------------------------------
    const btnRunTranslation = document.getElementById('btnRunTranslation');
    const translationLangSelect = document.getElementById('translationLangSelect');
    const transTargetText = document.getElementById('transTargetText');

    if (btnRunTranslation && translationLangSelect) {
      btnRunTranslation.addEventListener('click', async () => {
        const text = state.lastDocumentText || 'Executive Overview: The rapid acceleration of generative AI and unstructured data intelligence presents both an immense opportunity and a competitive imperative for Nexus Enterprises.';
        const targetLanguage = translationLangSelect.value;

        showLoader('Generating dual-pane translation...');
        try {
          const res = await fetch('/api/analyze/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, targetLanguage })
          });

          const data = await res.json();
          if (data.success && transTargetText) {
            transTargetText.innerHTML = `
              <div style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem;">${data.targetLanguageName} Translated Preview</div>
              <div>${data.translatedText}</div>
            `;
          }
        } catch (err) {
          console.error(err);
        } finally {
          hideLoader();
        }
      });
    }

    // -----------------------------------------------------------------------
    // FEATURE 17: Cloud Storage Direct Integrations (Drive / Dropbox / OneDrive)
    // -----------------------------------------------------------------------
    if (btnCloudStorageModalOpen) {
      btnCloudStorageModalOpen.addEventListener('click', () => cloudModal.classList.add('open'));
    }
    if (btnCloudModalClose) {
      btnCloudModalClose.addEventListener('click', () => cloudModal.classList.remove('open'));
      cloudModal.addEventListener('click', (e) => { if (e.target === cloudModal) cloudModal.classList.remove('open'); });
    }

    const cloudProviders = [
      { id: 'btnPickGoogleDrive', sample: 'financial', provider: 'Google Drive' },
      { id: 'btnPickDropbox', sample: 'resume', provider: 'Dropbox' },
      { id: 'btnPickOneDrive', sample: 'strategy_memo', provider: 'Microsoft OneDrive' }
    ];

    cloudProviders.forEach(cp => {
      const btn = document.getElementById(cp.id);
      if (btn) {
        btn.addEventListener('click', () => {
          cloudModal.classList.remove('open');
          showToast(`Importing from ${cp.provider}...`, 'info');
          showLoader(`Importing dataset from ${cp.provider}...`);
          setTimeout(() => {
            loadSampleWorkflow(cp.sample);
          }, 600);
        });
      }
    });

    // -----------------------------------------------------------------------
    // FEATURE 18: Shareable Read-Only Workspace Links
    // -----------------------------------------------------------------------
    if (btnShareModalOpen) {
      btnShareModalOpen.addEventListener('click', async () => {
        shareModal.classList.add('open');
        try {
          const res = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentTitle: state.activeFile?.filename || 'Financial & Intelligence Analysis',
              summary: 'Comprehensive multi-format document analysis and automated visualization suite.'
            })
          });
          const data = await res.json();
          if (data.success && shareUrlInput) {
            shareUrlInput.value = data.shareUrl;
          }
        } catch (err) {
          console.error(err);
        }
      });
    }

    if (btnShareModalClose) {
      btnShareModalClose.addEventListener('click', () => shareModal.classList.remove('open'));
      shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.remove('open'); });
    }

    if (btnCopyShareUrl && shareUrlInput) {
      btnCopyShareUrl.addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrlInput.value);
        btnCopyShareUrl.textContent = 'Copied! ✔';
        showToast('Share link copied to clipboard!', 'success');
        setTimeout(() => { btnCopyShareUrl.textContent = 'Copy Link'; }, 2000);
      });
    }
  }

  function populatePivotDropdowns(columns, profiles) {
    const dimSelect = document.getElementById('pivotDimensionSelect');
    const metricSelect = document.getElementById('pivotMetricSelect');
    if (!dimSelect || !metricSelect || !columns) return;

    dimSelect.innerHTML = columns.map(c => `<option value="${c}">${c}</option>`).join('');

    const numCols = columns.filter(c => profiles && profiles[c] && profiles[c].type === 'number');
    const validMetrics = numCols.length > 0 ? numCols : columns;

    metricSelect.innerHTML = validMetrics.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // UI Loader helpers
  function showLoader(msg = 'Processing...') {
    if (loaderText) loaderText.textContent = msg;
    if (loaderOverlay) loaderOverlay.classList.add('active');
  }

  function hideLoader() {
    if (loaderOverlay) loaderOverlay.classList.remove('active');
  }

  // Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="toast-icon">${icons[type] || icons.info}</div><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Expose toast globally for inline onclick handlers
  window.showToast = showToast;
});
