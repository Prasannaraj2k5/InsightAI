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
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    supportedExtensions: ['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.doc', '.txt', '.json']
  });
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

/**
 * Interactive API Documentation Endpoint
 */
router.get('/docs', (req, res) => {
  res.json({
    title: 'InsightAI REST API Specification',
    version: '1.0.0',
    endpoints: [
      {
        path: '/api/upload',
        method: 'POST',
        description: 'Upload Excel, CSV, PDF, DOCX, or TXT file and receive automated parsed structures and AI analytics.',
        parameters: { file: 'multipart/form-data (required)', jobDescription: 'string (optional)' }
      },
      {
        path: '/api/analyze/document',
        method: 'POST',
        description: 'Extract executive summaries, key takeaways, action items, metrics, and sentiment from raw text.',
        parameters: { text: 'string (required)' }
      },
      {
        path: '/api/analyze/data',
        method: 'POST',
        description: 'Profile tabular datasets with statistical distributions, outlier detection, and Chart.js specs.',
        parameters: { data: 'Array<Object> (required)' }
      },
      {
        path: '/api/analyze/resume',
        method: 'POST',
        description: 'Screen candidate resumes against Job Descriptions, calculate ATS match score, and generate radar chart.',
        parameters: { resumeText: 'string (required)', jobDescription: 'string (optional)' }
      },
      {
        path: '/api/query',
        method: 'POST',
        description: 'Ask natural language questions over document text with cited sources and confidence scores.',
        parameters: { documentText: 'string (required)', question: 'string (required)' }
      },
      {
        path: '/api/samples/:name',
        method: 'GET',
        description: 'Retrieve pre-bundled realistic samples (financial, resume, strategy_memo).',
        parameters: { name: 'financial | resume | strategy_memo' }
      },
      {
        path: '/api/health',
        method: 'GET',
        description: 'Health check and runtime telemetry.',
        parameters: {}
      }
    ]
  });
});

module.exports = router;
