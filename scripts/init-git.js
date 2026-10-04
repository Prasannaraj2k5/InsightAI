const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const repoDir = path.resolve(__dirname, '..');

async function getAllFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    // Skip node_modules and .git
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.DS_Store') {
      continue;
    }

    if (entry.isDirectory()) {
      files = files.concat(await getAllFiles(fullPath, baseDir));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

async function initGit() {
  console.log(`Initializing Git repository in ${repoDir}...`);
  await git.init({ fs, dir: repoDir, defaultBranch: 'main' });

  const files = await getAllFiles(repoDir);
  console.log(`Staging ${files.length} project files...`);

  for (const file of files) {
    await git.add({ fs, dir: repoDir, filepath: file });
  }

  const commitSha = await git.commit({
    fs,
    dir: repoDir,
    author: {
      name: 'Prasanna Raj',
      email: 'prasannaraj2k5@github.com'
    },
    message: 'feat: initialize InsightAI - AI Document Intelligence & Data Analytics Platform\n\n- Multi-format file parsing pipeline (.xlsx, .csv, .pdf, .docx, .txt)\n- Tabular data profiler with automated Chart.js visualizations\n- Resume screening & ATS match scoring engine with competency radar\n- Executive document summarization, metrics extraction, and NER\n- Contextual document Q&A engine with cited source excerpts\n- Scalable Express REST API gateway with interactive developer console'
  });

  console.log(`✅ Git commit created successfully! Commit SHA: ${commitSha}`);
}

initGit().catch(err => {
  console.error('Error during git init:', err);
  process.exit(1);
});
