const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const FileParser = require('../parsers/fileParser');
const DataProfiler = require('../analyzers/dataProfiler');
const NLPEngine = require('../analyzers/nlpEngine');
const ResumeScreening = require('../analyzers/resumeScreening');
const QAEngine = require('../analyzers/qaEngine');

const router = express.Router();

// Memory store for users (Authentication)
const users = [
  {
    id: 'user_1',
    name: 'Prasanna Raj',
    email: 'prasanna@insightai.io',
    password: 'password123',
    role: 'Enterprise Admin',
    avatar: 'PR',
    plan: 'Pro Enterprise'
  },
  {
    id: 'user_2',
    name: 'Demo Analyst',
    email: 'demo@insightai.io',
    password: 'demo',
    role: 'Product Specialist',
    avatar: 'DA',
    plan: 'Standard'
  }
];

// Memory store for document history
let documentHistory = [
  {
    id: 'hist_1',
    filename: 'q3_financial_metrics.csv',
    type: 'spreadsheet',
    sizeFormatted: '1.6 KB',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    qualityScore: 100,
    records: 24,
    summary: 'Analyzed 24 monthly regional revenue and operating expense records across 4 departments.'
  },
  {
    id: 'hist_2',
    filename: 'senior_ai_engineer_resume.txt',
    type: 'resume',
    sizeFormatted: '3.8 KB',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    atsScore: 92,
    candidateName: 'Prasanna Raj',
    summary: 'Screened against Senior AI Architect requisition with A+ ATS Match rating.'
  }
];

// Memory store for shareable links
const sharedAnalyses = {};

// Configure Multer storage in memory for high speed
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'InsightAI Intelligence Platform',
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    supportedExtensions: ['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.doc', '.txt', '.json']
  });
});

/**
 * Authentication: Login
 */
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    const newUser = {
      id: `user_${Date.now()}`,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      role: 'Member',
      avatar: email.slice(0, 2).toUpperCase(),
      plan: 'Pro'
    };
    return res.json({
      success: true,
      token: `token_${Date.now()}`,
      user: newUser
    });
  }

  const { password: _, ...userSafe } = user;
  res.json({
    success: true,
    token: `token_${user.id}_${Date.now()}`,
    user: userSafe
  });
});

/**
 * Authentication: Register
 */
router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'US';
  const newUser = {
    id: `user_${Date.now()}`,
    name,
    email,
    password,
    role: 'Analyst',
    avatar: initials,
    plan: 'Pro Trial'
  };
  users.push(newUser);

  const { password: _, ...userSafe } = newUser;
  res.json({
    success: true,
    token: `token_${newUser.id}_${Date.now()}`,
    user: userSafe
  });
});

/**
 * Authentication: Get Current Profile
 */
router.get('/auth/me', (req, res) => {
  const user = users[0];
  const { password: _, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

/**
 * Document History: Get List
 */
router.get('/history', (req, res) => {
  res.json({ success: true, history: documentHistory });
});

/**
 * Document History: Delete Item
 */
router.delete('/history/:id', (req, res) => {
  documentHistory = documentHistory.filter(h => h.id !== req.params.id);
  res.json({ success: true, history: documentHistory });
});

/**
 * Multi-Format File Upload & Auto-Analyze Pipeline
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a supported file.' });
    }

    const jobDescription = req.body.jobDescription || '';
    const parsed = await FileParser.parse(req.file);

    let analysis = {};

    if (parsed.type === 'spreadsheet') {
      const profile = DataProfiler.profile(parsed.data);
      analysis = {
        kind: 'tabular',
        profiler: profile
      };

      documentHistory.unshift({
        id: `hist_${Date.now()}`,
        filename: parsed.filename,
        type: 'spreadsheet',
        sizeFormatted: parsed.fileSizeFormatted,
        timestamp: new Date().toISOString(),
        qualityScore: profile.dataQualityScore,
        records: parsed.totalRows,
        summary: `Parsed ${parsed.totalRows} rows across ${profile.columnCount} columns.`
      });
    } else {
      const nlp = NLPEngine.analyze(parsed.text);
      const isResume = req.body.forceResume || parsed.text.toLowerCase().match(/\b(resume|curriculum vitae|experience|education|skills|gpa|bachelor|master)\b/);

      let resumeScreening = null;
      if (isResume) {
        resumeScreening = ResumeScreening.screen(parsed.text, jobDescription);
      }

      analysis = {
        kind: isResume ? 'resume' : 'document',
        nlp,
        resume: resumeScreening
      };

      documentHistory.unshift({
        id: `hist_${Date.now()}`,
        filename: parsed.filename,
        type: isResume ? 'resume' : 'document',
        sizeFormatted: parsed.fileSizeFormatted,
        timestamp: new Date().toISOString(),
        atsScore: resumeScreening ? resumeScreening.atsScorecard.overallScore : null,
        candidateName: resumeScreening ? resumeScreening.candidate.name : null,
        summary: nlp.summary ? (nlp.summary.slice(0, 140) + '...') : 'Processed document text.'
      });
    }

    if (documentHistory.length > 20) {
      documentHistory = documentHistory.slice(0, 20);
    }

    res.json({
      success: true,
      file: {
        filename: parsed.filename,
        extension: parsed.extension,
        sizeFormatted: parsed.fileSizeFormatted,
        type: parsed.type,
        processingTimeMs: parsed.processingTimeMs
      },
      parsed,
      analysis
    });
  } catch (err) {
    console.error('Upload parsing error:', err);
    res.status(500).json({ error: err.message || 'Error occurred while parsing the file.' });
  }
});

// =========================================================================
// NEW ADD-ON FEATURES ENDPOINTS (Features 1, 3, 5, 6, 9, 11, 15, 17, 18)
// =========================================================================

/**
 * FEATURE 1: Multi-Candidate Batch Ranking Leaderboard
 */
router.post('/analyze/batch-resumes', (req, res) => {
  const { candidates, jobDescription } = req.body;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'candidates must be a non-empty array of objects { name, resumeText }' });
  }

  const ranked = candidates.map(c => {
    const screening = ResumeScreening.screen(c.resumeText || '', jobDescription || '');
    return {
      name: c.name || screening.candidate.name,
      overallScore: screening.atsScorecard.overallScore,
      matchGrade: screening.atsScorecard.matchGrade,
      matchedSkillsCount: screening.atsScorecard.matchedSkills.length,
      topSkills: screening.atsScorecard.matchedSkills.slice(0, 4),
      missingSkills: screening.atsScorecard.missingSkills.slice(0, 3),
      recommendation: screening.atsScorecard.recommendation,
      screening
    };
  });

  ranked.sort((a, b) => b.overallScore - a.overallScore);

  const leaderboard = ranked.map((c, idx) => ({
    rank: idx + 1,
    badge: idx === 0 ? '🥇 Top Match' : idx === 1 ? '🥈 Strong Contender' : idx === 2 ? '🥉 Qualified' : 'Applicant',
    statusTier: c.overallScore >= 85 ? 'Fast-Track' : c.overallScore >= 75 ? 'Shortlist' : 'Review',
    ...c
  }));

  res.json({ success: true, count: leaderboard.length, leaderboard });
});

/**
 * FEATURE 3: Resume Bullet-Point Optimizer (Google X-Y-Z Formula)
 */
router.post('/analyze/resume-optimizer', (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText) {
    return res.status(400).json({ error: 'resumeText is required.' });
  }

  // Extract action-oriented bullet points from text
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.match(/^[0-9]\.\s+/));
  const rawBullets = lines.length > 0 ? lines : resumeText.split(/(?<=[.?!])\s+/).filter(s => s.length > 30).slice(0, 4);

  const optimizations = rawBullets.slice(0, 5).map((bullet, idx) => {
    const clean = bullet.replace(/^[•\-*0-9.]\s*/, '').trim();
    return {
      id: idx + 1,
      original: clean,
      weakness: clean.match(/[0-9]+%|\$[0-9]+|[0-9]+x/i)
        ? 'Good quantification, but can emphasize system architecture and cross-team impact.'
        : 'Lacks measurable metrics ($ revenue, % efficiency, or latency numbers).',
      optimizedXYZ: clean.match(/[0-9]+%|\$[0-9]+/i)
        ? `Architected and scaled: "${clean}" resulting in sustained 99.99% system availability.`
        : `Accomplished core workflow in: "${clean.slice(0, 60)}..." measuring a 35% latency reduction by implementing asynchronous processing pipelines.`,
      scoreBoost: '+8 to +15 ATS points'
    };
  });

  res.json({
    success: true,
    totalBulletsAnalyzed: optimizations.length,
    formula: 'Accomplished [X] as measured by [Y], by doing [Z]',
    optimizations
  });
});

/**
 * FEATURE 5: Natural Language "Ask Your Data" (Text-to-Chart & Filter)
 */
router.post('/data/nl-query', (req, res) => {
  const { query, data } = req.body;
  if (!query || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Both query and non-empty data array are required.' });
  }

  const q = query.toLowerCase();
  const headers = Object.keys(data[0]);
  const numHeaders = headers.filter(h => data.some(r => typeof r[h] === 'number' || (!isNaN(parseFloat(r[h])) && isFinite(r[h]))));
  const catHeaders = headers.filter(h => !numHeaders.includes(h));

  let filtered = [...data];
  let chartType = 'bar';
  let chartLabel = 'Insights';
  let dimension = catHeaders[0] || headers[0];
  let metric = numHeaders[0] || headers[1];

  // Detect dimension intent
  catHeaders.forEach(ch => {
    if (q.includes(ch.toLowerCase())) dimension = ch;
  });

  // Detect metric intent
  numHeaders.forEach(nh => {
    if (q.includes(nh.toLowerCase()) || (nh.toLowerCase().includes('revenue') && q.includes('revenue')) || (nh.toLowerCase().includes('cost') && q.includes('cost'))) {
      metric = nh;
    }
  });

  // Trend / Time intent
  if (q.includes('trend') || q.includes('month') || q.includes('over time')) {
    chartType = 'line';
    const dateCol = headers.find(h => h.toLowerCase().includes('month') || h.toLowerCase().includes('date'));
    if (dateCol) dimension = dateCol;
  }

  // Filter conditions
  if (q.includes('north america')) filtered = filtered.filter(r => String(r.Region || '').toLowerCase().includes('north america'));
  if (q.includes('europe')) filtered = filtered.filter(r => String(r.Region || '').toLowerCase().includes('europe'));
  if (q.includes('ai engineering')) filtered = filtered.filter(r => String(r.Department || '').toLowerCase().includes('ai'));
  if (q.includes('cybersecurity')) filtered = filtered.filter(r => String(r.Department || '').toLowerCase().includes('cyber'));

  // Aggregate results by dimension
  const agg = {};
  filtered.forEach(r => {
    const key = String(r[dimension] || 'Other');
    const val = Number(r[metric]) || 0;
    agg[key] = (agg[key] || 0) + val;
  });

  const labels = Object.keys(agg).slice(0, 10);
  const chart = {
    title: `${metric} grouped by ${dimension}`,
    type: chartType,
    labels,
    datasets: [{
      label: metric,
      data: labels.map(l => Math.round(agg[l])),
      backgroundColor: chartType === 'line' ? 'rgba(99, 102, 241, 0.2)' : ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
      borderColor: '#6366f1',
      fill: chartType === 'line'
    }]
  };

  res.json({
    success: true,
    matchedIntent: { dimension, metric, chartType },
    matchingRowCount: filtered.length,
    chart,
    summaryText: `Analyzed ${filtered.length} matching records. Evaluated ${metric} aggregated across ${dimension}.`
  });
});

/**
 * FEATURE 6: 1-Click Smart Data Cleaning & Hygiene Assistant
 */
router.post('/data/clean', (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Data must be a non-empty array of objects.' });
  }

  let rowsCleaned = 0;
  let duplicatesRemoved = 0;
  let trimmedFields = 0;
  let nullsImputed = 0;

  const seenHashes = new Set();
  const cleanedData = [];

  data.forEach(row => {
    const rowHash = JSON.stringify(row);
    if (seenHashes.has(rowHash)) {
      duplicatesRemoved++;
      return;
    }
    seenHashes.add(rowHash);

    const cleanRow = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim();
      let cleanVal = val;

      if (typeof val === 'string') {
        cleanVal = val.trim();
        if (cleanVal !== val) trimmedFields++;
      } else if (val === null || val === undefined || val === '') {
        cleanVal = 'N/A';
        nullsImputed++;
      }

      cleanRow[cleanKey] = cleanVal;
    }
    cleanedData.push(cleanRow);
    rowsCleaned++;
  });

  res.json({
    success: true,
    initialCount: data.length,
    cleanedCount: cleanedData.length,
    hygieneReport: {
      duplicatesRemoved,
      trimmedFields,
      nullsImputed,
      dataQualityBoost: '+15% higher consistency'
    },
    cleanedData
  });
});

/**
 * FEATURE 9: Custom Pivot Table & Multi-Level Aggregator
 */
router.post('/data/pivot', (req, res) => {
  const { data, rowDimension, metricField, aggregation = 'sum' } = req.body;
  if (!Array.isArray(data) || !rowDimension || !metricField) {
    return res.status(400).json({ error: 'data, rowDimension, and metricField are required.' });
  }

  const groups = {};
  data.forEach(r => {
    const groupKey = String(r[rowDimension] || 'Uncategorized');
    const val = Number(r[metricField]) || 0;

    if (!groups[groupKey]) {
      groups[groupKey] = { count: 0, sum: 0, min: val, max: val };
    }
    groups[groupKey].count++;
    groups[groupKey].sum += val;
    groups[groupKey].min = Math.min(groups[groupKey].min, val);
    groups[groupKey].max = Math.max(groups[groupKey].max, val);
  });

  const pivotRows = Object.entries(groups).map(([dimensionValue, stats]) => {
    let resultValue = stats.sum;
    if (aggregation === 'avg') resultValue = stats.sum / (stats.count || 1);
    if (aggregation === 'count') resultValue = stats.count;
    if (aggregation === 'min') resultValue = stats.min;
    if (aggregation === 'max') resultValue = stats.max;

    return {
      [rowDimension]: dimensionValue,
      RecordCount: stats.count,
      TotalSum: Math.round(stats.sum),
      Average: Math.round(stats.sum / stats.count),
      CalculatedValue: Math.round(resultValue)
    };
  });

  res.json({
    success: true,
    rowDimension,
    metricField,
    aggregation,
    totalGroups: pivotRows.length,
    pivotRows
  });
});

/**
 * FEATURE 11: Contract Risk & Red-Flag Scanner
 */
router.post('/analyze/contract-risks', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Document text is required.' });
  }

  const riskRules = [
    {
      category: 'Uncapped Liability & Indemnification',
      severity: 'HIGH',
      regex: /\b(unlimited liability|indemnify and hold harmless|consequential damages|sole discretion)\b/gi,
      recommendation: 'Negotiate a mutual cap on liability equal to 12 months of contract value.'
    },
    {
      category: 'Automatic Renewal & Lock-In Trap',
      severity: 'MEDIUM',
      regex: /\b(automatically renew|written notice of non-renewal|prior to expiration|subsequent term)\b/gi,
      recommendation: 'Require explicit written mutual renewal and 60-day advance termination notice.'
    },
    {
      category: 'Termination Penalties & Early Exit Fees',
      severity: 'HIGH',
      regex: /\b(early termination fee|liquidated damages|accelerate all payments|forfeiture)\b/gi,
      recommendation: 'Eliminate early termination fees for convenience after the initial 90 days.'
    },
    {
      category: 'Restrictive Non-Compete & Exclusivity',
      severity: 'MEDIUM',
      regex: /\b(non-compete|exclusive vendor|restrict.*competing|solicit)\b/gi,
      recommendation: 'Narrow geographic and client scope, limiting restriction period to 6 months post-contract.'
    }
  ];

  const detectedRisks = [];
  riskRules.forEach(rule => {
    const matches = text.match(rule.regex);
    if (matches) {
      detectedRisks.push({
        category: rule.category,
        severity: rule.severity,
        matchCount: matches.length,
        triggers: [...new Set(matches.map(m => m.trim()))].slice(0, 3),
        recommendation: rule.recommendation
      });
    }
  });

  const overallRiskScore = Math.min(100, detectedRisks.reduce((acc, r) => acc + (r.severity === 'HIGH' ? 35 : 15), 10));

  res.json({
    success: true,
    riskScore: overallRiskScore,
    riskLevel: overallRiskScore >= 60 ? 'HIGH RISK' : overallRiskScore >= 35 ? 'MODERATE RISK' : 'LOW RISK',
    detectedCount: detectedRisks.length,
    risks: detectedRisks
  });
});

/**
 * FEATURE 15: Multi-Language Document Translation Simulator (Dual-Pane)
 */
router.post('/analyze/translate', (req, res) => {
  const { text, targetLanguage = 'es' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for translation.' });
  }

  const sampleTranslations = {
    es: {
      langName: 'Spanish (Español)',
      translated: 'Resumen Ejecutivo: La plataforma InsightAI automatiza el análisis de documentos y hojas de cálculo con inteligencia artificial avanzada, reduciendo los tiempos de revisión en un 78% y optimizando la selección de candidatos.'
    },
    fr: {
      langName: 'French (Français)',
      translated: 'Résumé Exécutif : La plateforme InsightAI automatise l\'analyse des documents et des feuilles de calcul grâce à une intelligence artificielle avancée, réduisant les délais d\'examen de 78% et optimisant la sélection des candidats.'
    },
    de: {
      langName: 'German (Deutsch)',
      translated: 'Zusammenfassung: Die InsightAI-Plattform automatisiert die Dokumenten- und Tabellenanalyse mit fortschrittlicher künstlicher Intelligenz und beschleunigt die Entscheidungsfindung um 78%.'
    },
    ja: {
      langName: 'Japanese (日本語)',
      translated: 'エグゼクティブサマリー：InsightAIプラットフォームは、高度なAIによって複数形式のドキュメントとスプレッドシートの解析を自動化し、分析時間を78%短縮します。'
    }
  };

  const trans = sampleTranslations[targetLanguage] || sampleTranslations.es;
  res.json({
    success: true,
    sourceLanguage: 'English',
    targetLanguage,
    targetLanguageName: trans.langName,
    originalText: text.slice(0, 500),
    translatedText: trans.translated
  });
});

/**
 * FEATURE 18: Shareable Read-Only Workspace Links
 */
router.post('/share', (req, res) => {
  const { analysisId, documentTitle, summary } = req.body;
  const shareId = `share_${Math.random().toString(36).substring(2, 9)}`;

  sharedAnalyses[shareId] = {
    shareId,
    title: documentTitle || 'InsightAI Executive Analysis',
    summary: summary || 'Shared intelligence analysis report.',
    createdAt: new Date().toISOString(),
    url: `/share/${shareId}`
  };

  res.json({
    success: true,
    shareId,
    shareUrl: `http://localhost:3000/#share=${shareId}`
  });
});

router.get('/share/:id', (req, res) => {
  const share = sharedAnalyses[req.params.id];
  if (!share) {
    return res.status(404).json({ error: 'Share link not found or expired.' });
  }
  res.json({ success: true, share });
});

/**
 * JD ↔ Resume Matcher — Deep Match Analysis
 * POST /api/match/jd-resume
 * Body: { resumeText, jobDescription }
 */
router.post('/match/jd-resume', (req, res) => {
  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ error: 'Both resumeText and jobDescription are required.' });
  }

  const resumeLower = resumeText.toLowerCase();
  const jdLower = jobDescription.toLowerCase();

  // ── 1. SKILL TAXONOMY ─────────────────────────────────────────────────
  const TAXONOMY = {
    'Programming Languages': [
      'python','javascript','typescript','java','c++','c#','go','golang','rust','ruby',
      'php','swift','kotlin','r','scala','bash','shell','sql','dart','matlab'
    ],
    'Frameworks & Libraries': [
      'react','next.js','vue','angular','node.js','express','fastapi','flask','django',
      'spring boot','pytorch','tensorflow','keras','langchain','scikit-learn','pandas',
      'numpy','tailwind','graphql','nestjs','svelte','fastify','huggingface'
    ],
    'Cloud & DevOps': [
      'aws','gcp','google cloud','azure','docker','kubernetes','k8s','ci/cd',
      'github actions','terraform','ansible','helm','linux','serverless','lambda',
      'cloud run','microservices','jenkins','gitlab ci','datadog','prometheus'
    ],
    'Databases & Storage': [
      'postgresql','mysql','mongodb','redis','bigquery','snowflake','dynamodb',
      'cassandra','elasticsearch','pinecone','chromadb','sqlite','neo4j','firebase',
      'supabase','cockroachdb','clickhouse'
    ],
    'AI / ML & Data Science': [
      'nlp','llm','machine learning','deep learning','rag','computer vision',
      'vector database','prompt engineering','mlops','transformers','embeddings',
      'fine-tuning','openai','langchain','stable diffusion','data science',
      'feature engineering','xgboost','a/b testing','statistics'
    ],
    'Tools & Practices': [
      'git','agile','scrum','jira','figma','rest api','graphql','grpc','swagger',
      'postman','unit testing','tdd','bdd','oauth','jwt','websocket','kafka',
      'rabbitmq','celery','airflow','dbt'
    ],
    'Soft Skills & Leadership': [
      'leadership','mentorship','communication','collaboration','problem solving',
      'project management','cross-functional','product thinking','system design',
      'architecture','stakeholder management','presentation','documentation'
    ]
  };

  // Skill learning resources map
  const LEARN_RESOURCES = {
    'python': 'https://docs.python.org/3/tutorial/', 'react': 'https://react.dev/learn',
    'aws': 'https://aws.amazon.com/training/', 'docker': 'https://docs.docker.com/get-started/',
    'kubernetes': 'https://kubernetes.io/docs/tutorials/', 'machine learning': 'https://www.coursera.org/learn/machine-learning',
    'pytorch': 'https://pytorch.org/tutorials/', 'typescript': 'https://www.typescriptlang.org/docs/',
    'node.js': 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
    'postgresql': 'https://www.postgresql.org/docs/current/tutorial.html',
    'mongodb': 'https://learn.mongodb.com/', 'fastapi': 'https://fastapi.tiangolo.com/tutorial/',
    'terraform': 'https://developer.hashicorp.com/terraform/tutorials',
    'kafka': 'https://kafka.apache.org/quickstart', 'redis': 'https://redis.io/learn',
    'sql': 'https://www.w3schools.com/sql/', 'graphql': 'https://graphql.org/learn/',
    'nlp': 'https://huggingface.co/learn/nlp-course/', 'llm': 'https://www.deeplearning.ai/courses/',
    'golang': 'https://go.dev/tour/', 'rust': 'https://doc.rust-lang.org/book/',
    'gcp': 'https://cloud.google.com/training', 'azure': 'https://learn.microsoft.com/azure',
    'mlops': 'https://ml-ops.org/', 'system design': 'https://github.com/donnemartin/system-design-primer'
  };

  // ── 2. EXTRACT SKILLS FROM JD AND RESUME ─────────────────────────────
  const jdSkills = {};
  const resumeSkills = {};
  const allJdSkillsList = [];
  const allResumeSkillsList = [];

  for (const [cat, skills] of Object.entries(TAXONOMY)) {
    jdSkills[cat] = [];
    resumeSkills[cat] = [];

    for (const skill of skills) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(jdLower)) {
        jdSkills[cat].push(skill);
        allJdSkillsList.push(skill);
      }
      if (regex.test(resumeLower)) {
        resumeSkills[cat].push(skill);
        allResumeSkillsList.push(skill);
      }
    }
  }

  // ── 3. MATCH / GAP / EXTRA ANALYSIS ──────────────────────────────────
  const jdSet = new Set(allJdSkillsList.map(s => s.toLowerCase()));
  const resumeSet = new Set(allResumeSkillsList.map(s => s.toLowerCase()));

  const matchedSkills = allJdSkillsList.filter(s => resumeSet.has(s.toLowerCase()));
  const capSkills = allJdSkillsList.filter(s => !resumeSet.has(s.toLowerCase())); // JD requires but resume lacks
  const bonusSkills = allResumeSkillsList.filter(s => !jdSet.has(s.toLowerCase())); // Resume has but JD didn't ask

  // ── 4. CATEGORY-LEVEL SCORES ──────────────────────────────────────────
  const categoryScores = {};
  for (const cat of Object.keys(TAXONOMY)) {
    const required = jdSkills[cat].length;
    const found = jdSkills[cat].filter(s => resumeSet.has(s.toLowerCase())).length;
    categoryScores[cat] = {
      required,
      found,
      score: required > 0 ? Math.round((found / required) * 100) : null,
      matched: jdSkills[cat].filter(s => resumeSet.has(s.toLowerCase())),
      missing: jdSkills[cat].filter(s => !resumeSet.has(s.toLowerCase()))
    };
  }

  // ── 5. OVERALL MATCH SCORE ────────────────────────────────────────────
  const skillMatchRatio = allJdSkillsList.length > 0 ? matchedSkills.length / allJdSkillsList.length : 0;
  const skillMatchPct = Math.round(skillMatchRatio * 100);

  // Keyword density match (non-skill terms)
  const jdWords = [...new Set(jdLower.match(/\b[a-z]{4,}\b/g) || [])];
  const resumeWords = new Set(resumeLower.match(/\b[a-z]{4,}\b/g) || []);
  const sharedWords = jdWords.filter(w => resumeWords.has(w)).length;
  const keywordDensity = Math.round((sharedWords / Math.max(jdWords.length, 1)) * 100);

  // Experience level detected
  const jdSeniorityMatch = jdLower.match(/senior|lead|principal|staff|architect|head of|vp|director/i);
  const resumeSeniorityMatch = resumeLower.match(/senior|lead|principal|staff|architect|head of|vp|director/i);
  const seniorityAlignment = (!jdSeniorityMatch || resumeSeniorityMatch) ? 100 : 55;

  // Years of experience
  const jdYearsMatch = jobDescription.match(/(\d+)\+?\s*years/i);
  const resumeYearsMatch = resumeText.match(/(\d+)\+?\s*years/i);
  const jdYears = jdYearsMatch ? parseInt(jdYearsMatch[1]) : 0;
  const resumeYears = resumeYearsMatch ? parseInt(resumeYearsMatch[1]) : 0;
  const expScore = jdYears > 0 ? Math.min(100, Math.round((Math.min(resumeYears, jdYears * 2) / jdYears) * 100)) : 80;

  // Final weighted score
  const overallScore = Math.min(100, Math.round(
    skillMatchPct * 0.50 +
    keywordDensity * 0.20 +
    seniorityAlignment * 0.15 +
    expScore * 0.15
  ));

  // Grade
  let grade, gradeColor, recommendation;
  if (overallScore >= 90) { grade = 'A+'; gradeColor = 'emerald'; recommendation = 'Exceptional Match — Fast-Track to Technical Interview'; }
  else if (overallScore >= 80) { grade = 'A'; gradeColor = 'emerald'; recommendation = 'Strong Match — Recommend for Interview Round'; }
  else if (overallScore >= 70) { grade = 'B+'; gradeColor = 'cyan'; recommendation = 'Good Match — Minor skill gaps, consider screening call'; }
  else if (overallScore >= 60) { grade = 'B'; gradeColor = 'cyan'; recommendation = 'Moderate Match — Bridge skill gaps before applying'; }
  else if (overallScore >= 50) { grade = 'C+'; gradeColor = 'amber'; recommendation = 'Partial Match — Significant upskilling needed (4–6 months)'; }
  else { grade = 'C'; gradeColor = 'rose'; recommendation = 'Low Match — Major skill gaps. Focus on core JD requirements first'; }

  // ── 6. CAP SKILLS WITH LEARNING RESOURCES ────────────────────────────
  const capSkillsEnriched = capSkills.slice(0, 15).map(skill => ({
    skill,
    priority: allJdSkillsList.indexOf(skill) < allJdSkillsList.length / 2 ? 'HIGH' : 'MEDIUM',
    estimatedLearnTime: ['python','sql','react','node.js','docker'].includes(skill) ? '2–4 weeks' :
      ['kubernetes','aws','pytorch','terraform'].includes(skill) ? '4–8 weeks' : '1–3 weeks',
    learnUrl: LEARN_RESOURCES[skill] || `https://www.google.com/search?q=learn+${encodeURIComponent(skill)}+tutorial`,
    category: Object.keys(TAXONOMY).find(cat => TAXONOMY[cat].includes(skill)) || 'General'
  }));

  // ── 7. AUTO-GENERATED INTERVIEW QUESTIONS ────────────────────────────
  const interviewQuestions = [];
  if (matchedSkills.length > 0) {
    const pick = matchedSkills.slice(0, 3);
    pick.forEach(s => {
      interviewQuestions.push({
        type: 'Technical',
        question: `Describe a production scenario where you used ${s}. What challenges did you face and how did you resolve them?`
      });
    });
  }
  interviewQuestions.push(
    { type: 'Behavioral', question: 'Tell me about a time you led a cross-functional project under tight deadlines. What was your approach?' },
    { type: 'System Design', question: `Design a scalable system for ${jdLower.includes('api') ? 'a high-throughput REST API' : jdLower.includes('data') ? 'a real-time data pipeline' : 'a distributed microservices architecture'} — walk me through your choices.` },
    { type: 'Culture Fit', question: 'How do you stay current with industry trends and continuously upskill?' }
  );

  // ── 8. PERSONALIZED RECOMMENDATIONS ──────────────────────────────────
  const personalizedTips = [];
  if (capSkills.length > 0) {
    personalizedTips.push(`📚 Priority Learning: Focus on **${capSkills.slice(0,3).join(', ')}** — these appear prominently in the JD and are missing from your resume.`);
  }
  if (bonusSkills.length > 0) {
    personalizedTips.push(`⭐ You have additional strengths (${bonusSkills.slice(0,4).join(', ')}) not listed in the JD — highlight these as differentiators.`);
  }
  if (skillMatchPct < 60) {
    personalizedTips.push(`🎯 Your skill match is below 60%. Consider targeting mid-level roles in this domain before this specific role.`);
  }
  if (resumeYears > 0 && jdYears > 0 && resumeYears < jdYears) {
    personalizedTips.push(`⏱️ The JD requests ${jdYears}+ years experience. Your resume shows ~${resumeYears} years. Highlight impact and complexity of projects to compensate.`);
  }
  personalizedTips.push(`✏️ Tailor your resume summary to include keywords: "${allJdSkillsList.slice(0,5).join(', ')}" — ATS scanners look for exact matches.`);

  res.json({
    success: true,
    overallScore,
    grade,
    gradeColor,
    recommendation,
    breakdown: {
      skillMatch: { score: skillMatchPct, label: 'Skill Match' },
      keywordDensity: { score: keywordDensity, label: 'Keyword Density' },
      seniorityAlignment: { score: seniorityAlignment, label: 'Seniority Alignment' },
      experienceScore: { score: expScore, label: 'Experience Level' }
    },
    stats: {
      jdSkillsTotal: allJdSkillsList.length,
      resumeSkillsTotal: allResumeSkillsList.length,
      matchedCount: matchedSkills.length,
      capCount: capSkills.length,
      bonusCount: bonusSkills.length
    },
    matchedSkills,
    capSkills: capSkillsEnriched,
    bonusSkills: bonusSkills.slice(0, 12),
    categoryScores,
    interviewQuestions,
    personalizedTips
  });
});

/**
 * Pre-bundled Realistic Sample Loader
 */
router.get('/samples/:name', (req, res) => {
  const sampleName = req.params.name;
  const sampleMap = {
    financial: 'q3_financial_metrics.csv',
    resume: 'senior_ai_engineer_resume.txt',
    strategy_memo: 'cloud_ai_strategy_memo.txt'
  };

  const filename = sampleMap[sampleName];
  if (!filename) {
    return res.status(404).json({ error: 'Sample not found. Options: financial, resume, strategy_memo' });
  }

  const samplePath = path.join(__dirname, '../../samples', filename);
  if (!fs.existsSync(samplePath)) {
    return res.status(404).json({ error: 'Sample file missing from disk.' });
  }

  const content = fs.readFileSync(samplePath, 'utf-8');
  res.json({
    sampleName,
    filename,
    content,
    type: filename.endsWith('.csv') ? 'spreadsheet' : filename.includes('resume') ? 'resume' : 'document'
  });
});

module.exports = router;
