const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Middleware for parsing JSON and urlencoded data with high payload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', apiRoutes);

// Fallback route for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('InsightAI Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`
=====================================================
  ✨ InsightAI Platform Server Running ✨
=====================================================
  🌐 Web Dashboard: http://localhost:${PORT}
  📡 API Base:     http://localhost:${PORT}/api
  📊 Health Check: http://localhost:${PORT}/api/health
  📖 API Docs:     http://localhost:${PORT}/api/docs
=====================================================
`);
});

module.exports = { app, server };
