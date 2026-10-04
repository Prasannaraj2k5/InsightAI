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
    version: '2.0.0',
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
    // If not found in seed, create a session user for smooth onboarding
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
  // Return the default user
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
 * Comprehensive Multi-Format File Upload & Auto-Analyze Pipeline
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

      // Record in history
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
      // Document (PDF, Word, or Text)
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

      // Record in history
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

/**
 * Direct Document Analysis Endpoint
 */
router.post('/analyze/document', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text field is required for document analysis.' });
  }
  const result = NLPEngine.analyze(text);
  res.json({ success: true, analysis: result });
});

/**
 * Tabular Data Profiling Endpoint
 */
router.post('/analyze/data', (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Data must be a non-empty array of objects.' });
  }
  const profile = DataProfiler.profile(data);
  res.json({ success: true, profile });
});

/**
 * Resume Screening & ATS Ranking Endpoint
 */
router.post('/analyze/resume', (req, res) => {
  const { resumeText, jobDescription } = req.body;
  if (!resumeText) {
    return res.status(400).json({ error: 'resumeText is required.' });
  }
  const screening = ResumeScreening.screen(resumeText, jobDescription || '');
  res.json({ success: true, screening });
});

/**
 * Contextual Document Q&A Endpoint
 */
router.post('/query', (req, res) => {
  const { documentText, question } = req.body;
  if (!documentText || !question) {
    return res.status(400).json({ error: 'Both documentText and question are required.' });
  }
  const answer = QAEngine.query(documentText, question);
  res.json({ success: true, result: answer });
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
