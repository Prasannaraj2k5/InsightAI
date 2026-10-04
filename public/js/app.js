/**
 * Main Application Logic for InsightAI Dashboard
 */
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentTab: 'tab-upload',
    activeFile: null,
    activeParsedData: null,
    activeAnalysis: null,
    lastDocumentText: ''
  };

  // DOM Elements
  const tabItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const loaderOverlay = document.getElementById('loaderOverlay');
  const loaderText = document.getElementById('loaderText');
  const statusIndicator = document.getElementById('statusIndicator');

  // KPI elements
  const kpiFileName = document.getElementById('kpiFileName');
  const kpiFileSize = document.getElementById('kpiFileSize');
  const kpiLatency = document.getElementById('kpiLatency');
  const kpiQuality = document.getElementById('kpiQuality');

  // Initialize
  initNavigation();
  initDragAndDrop();
  initSampleButtons();
  initQAEngine();
  initApiConsole();
  checkHealth();

  // Load sample dataset by default so user is wowed immediately on first view
  loadSampleWorkflow('financial');

  // 1. Navigation & Tab Switching
  function initNavigation() {
    tabItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    state.currentTab = tabId;
    tabItems.forEach(i => i.classList.toggle('active', i.getAttribute('data-tab') === tabId));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 2. Drag & Drop File Upload
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
    } catch (err) {
      alert(`Error analyzing file: ${err.message}`);
      console.error(err);
    } finally {
      hideLoader();
    }
  }

  // 3. Process & Route Analysis Results
  function processAnalysisResult(result) {
    state.activeFile = result.file;
    state.activeParsedData = result.parsed;
    state.activeAnalysis = result.analysis;

    // Update Global KPIs
    if (kpiFileName) kpiFileName.textContent = result.file.filename;
    if (kpiFileSize) kpiFileSize.textContent = result.file.sizeFormatted;
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

  // 4. Render Tabular BI Dashboard
  function renderTabularDashboard(parsed, profiler) {
    // Stats Summary Cards
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
    const previewContainer = document.getElementById('spreadsheetPreview');
    if (previewContainer && parsed.preview && parsed.preview.length > 0) {
      const headers = Object.keys(parsed.preview[0]);
      let html = '<table class="data-table"><thead><tr>';
      headers.forEach(h => html += `<th>${h}</th>`);
      html += '</tr></thead><tbody>';

      parsed.preview.slice(0, 15).forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
          const val = row[h];
          html += `<td>${val !== null && val !== undefined ? val : '<span style="color:var(--text-muted)">null</span>'}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      previewContainer.innerHTML = html;
    }

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
        // Fallback duplicate with different format if only 1 chart
        window.ChartManager.render('chartCanvas2', { ...profiler.charts[0], type: 'bar' });
      }
    }
  }

  // 5. Render Resume Screening & ATS Scorecard
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

    // Breakdown sub-bars
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
      strengthEl.innerHTML = ats.strengths.map(s => `<li style="margin-bottom: 0.35rem; color: var(--accent-emerald);">✔ ${s}</li>`).join('');
    }

    const gapsEl = document.getElementById('resGapsList');
    if (gapsEl) {
      gapsEl.innerHTML = ats.missingSkills.length > 0
        ? ats.missingSkills.map(s => `<li style="margin-bottom: 0.35rem; color: var(--accent-amber);">⚠ Missing recommended keyword: <strong>${s}</strong></li>`).join('')
        : '<li style="color: var(--accent-emerald);">✔ All target requisition skills detected!</li>';
    }
  }

  // 6. Render Document Intelligence Dashboard
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
        <div style="background: var(--bg-surface); padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-emerald);">${m.value}</div>
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

  // 7. Interactive Document Q&A
  function initQAEngine() {
    const askBtn = document.getElementById('btnAskDoc');
    const questionInput = document.getElementById('qaQuestionInput');
    const qaResponseCard = document.getElementById('qaResponseCard');
    const qaAnswerText = document.getElementById('qaAnswerText');
    const qaConfidenceBadge = document.getElementById('qaConfidenceBadge');
    const qaCitationsList = document.getElementById('qaCitationsList');

    if (!askBtn || !questionInput) return;

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

  // 8. Sample Loader Buttons
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

      // Create a Blob from sample text
      const blob = new Blob([sample.content], { type: sample.type === 'spreadsheet' ? 'text/csv' : 'text/plain' });
      const file = new File([blob], sample.filename);

      await handleFileUpload(file);
    } catch (err) {
      console.error(err);
    } finally {
      hideLoader();
    }
  }

  // 9. Interactive REST API Console
  function initApiConsole() {
    const runBtn = document.getElementById('btnRunApi');
    const endpointSelect = document.getElementById('apiEndpointSelect');
    const reqBodyTextarea = document.getElementById('apiRequestBody');
    const respBox = document.getElementById('apiResponseBody');
    const latencyBadge = document.getElementById('apiLatencyBadge');
    const curlCodeBox = document.getElementById('apiCurlCode');

    if (!runBtn || !endpointSelect) return;

    const templates = {
      health: { method: 'GET', url: '/api/health', body: '' },
      docs: { method: 'GET', url: '/api/docs', body: '' },
      analyzeDoc: {
        method: 'POST',
        url: '/api/analyze/document',
        body: JSON.stringify({ text: "Nexus Enterprises announced a $14.6M operational cost reduction by FY2028 through deployment of InsightAI." }, null, 2)
      },
      analyzeData: {
        method: 'POST',
        url: '/api/analyze/data',
        body: JSON.stringify({
          data: [
            { Month: "2026-01", Department: "AI Engineering", Revenue: 1250000 },
            { Month: "2026-02", Department: "AI Engineering", Revenue: 1380000 },
            { Month: "2026-03", Department: "AI Engineering", Revenue: 1520000 }
          ]
        }, null, 2)
      },
      analyzeResume: {
        method: 'POST',
        url: '/api/analyze/resume',
        body: JSON.stringify({
          resumeText: "PRASANNA RAJ - Senior Full Stack & AI Engineer. Experienced in Python, React, AWS, Docker, Kubernetes, NLP, and REST APIs.",
          jobDescription: "Looking for a Senior Python and React Engineer with AWS cloud and Docker experience."
        }, null, 2)
      },
      query: {
        method: 'POST',
        url: '/api/query',
        body: JSON.stringify({
          documentText: "The platform delivers 98.4% accuracy across financial documents and cuts analysis turnaround by 78%.",
          question: "What is the accuracy rate?"
        }, null, 2)
      }
    };

    endpointSelect.addEventListener('change', () => {
      const selected = endpointSelect.value;
      const t = templates[selected];
      if (t) {
        reqBodyTextarea.value = t.body;
        updateCurlPreview(t);
      }
    });

    // Initial curl preview
    updateCurlPreview(templates[endpointSelect.value]);

    function updateCurlPreview(t) {
      if (!curlCodeBox) return;
      if (t.method === 'GET') {
        curlCodeBox.textContent = `curl -X GET http://localhost:3000${t.url}`;
      } else {
        curlCodeBox.textContent = `curl -X POST http://localhost:3000${t.url} \\\n  -H "Content-Type: application/json" \\\n  -d '${t.body.replace(/\n/g, '')}'`;
      }
    }

    runBtn.addEventListener('click', async () => {
      const selected = endpointSelect.value;
      const t = templates[selected];
      const startTime = performance.now();
      runBtn.disabled = true;
      runBtn.textContent = 'Executing...';

      try {
        const options = { method: t.method };
        if (t.method === 'POST') {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = reqBodyTextarea.value;
        }

        const res = await fetch(t.url, options);
        const data = await res.json();
        const duration = Math.round(performance.now() - startTime);

        latencyBadge.textContent = `${res.status} OK • ${duration}ms`;
        respBox.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        respBox.textContent = `Error: ${err.message}`;
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Run Request';
      }
    });
  }

  // 10. System Health Poller
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (statusIndicator) {
          statusIndicator.innerHTML = `<span class="status-dot"></span> Online (v${data.version})`;
        }
      }
    } catch {
      if (statusIndicator) {
        statusIndicator.innerHTML = `<span class="status-dot" style="background:#f43f5e; box-shadow:0 0 8px #f43f5e;"></span> Offline`;
      }
    }
  }

  // UI Helper functions
  function showLoader(msg = 'Processing...') {
    if (loaderText) loaderText.textContent = msg;
    if (loaderOverlay) loaderOverlay.classList.add('active');
  }

  function hideLoader() {
    if (loaderOverlay) loaderOverlay.classList.remove('active');
  }
});
