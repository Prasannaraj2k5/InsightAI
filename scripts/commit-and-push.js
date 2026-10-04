/**
 * Stage, commit, and push all InsightAI UI changes to GitHub
 * Run: node scripts/commit-and-push.js <GITHUB_TOKEN>
 */
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const repoDir = path.resolve(__dirname, '..');
const repoUrl = 'https://github.com/Prasannaraj2k5/InsightAI.git';

async function getAllFiles(dir, base = dir, result = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(base, fullPath);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      await getAllFiles(fullPath, base, result);
    } else {
      result.push(rel);
    }
  }
  return result;
}

async function commitAndPush() {
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    console.error(`
======================================================================
  ⚠️  GitHub Token Required
======================================================================
  Run: node scripts/commit-and-push.js <YOUR_GITHUB_PAT>
  Get a token at: https://github.com/settings/tokens
  (Classic token with 'repo' scope)
======================================================================
`);
    process.exit(1);
  }

  console.log('📁 Staging all changed files...');
  const files = await getAllFiles(repoDir);

  for (const file of files) {
    try {
      await git.add({ fs, dir: repoDir, filepath: file });
    } catch (e) {
      // skip if untrackable
    }
  }
  console.log(`  ✔ Staged ${files.length} files.`);

  // Check status to see if anything to commit
  const status = await git.statusMatrix({ fs, dir: repoDir });
  const changed = status.filter(([, head, workdir, stage]) => head !== 1 || workdir !== 1 || stage !== 1);

  if (changed.length === 0) {
    console.log('✅ Nothing to commit — working tree clean. Attempting push anyway...');
  } else {
    console.log(`📝 Committing ${changed.length} changed files...`);
    const sha = await git.commit({
      fs,
      dir: repoDir,
      author: {
        name: 'Prasanna Raj',
        email: 'prasannaraj2k5@github.com'
      },
      message: `feat: Premium UI overhaul v3.0 — Inter font, glassmorphism redesign, animated ambient background, chat-style Q&A, toast notifications, improved modals, accessibility improvements, and all 9 add-on features (ATS, Pivot, NL Query, Data Cleaning, Contract Risk, Translation, Cloud Import, Share Link, Candidate Leaderboard)`
    });
    console.log(`  ✔ Commit created: ${sha}`);
  }

  console.log(`\n🚀 Pushing to ${repoUrl}...`);

  const result = await git.push({
    fs,
    http,
    dir: repoDir,
    remote: 'origin',
    url: repoUrl,
    ref: 'main',
    force: true,
    onAuth: () => ({ username: token, password: '' }),
    onAuthSuccess: () => console.log('  ✔ Authenticated with GitHub'),
    onAuthFailure: (url, auth) => {
      console.error('  ❌ Auth failed. Check token permissions (needs repo scope).');
      return { cancel: true };
    },
    onProgress: (evt) => {
      if (evt.phase) process.stdout.write(`\r  ⏳ ${evt.phase}: ${evt.loaded}/${evt.total || '?'}   `);
    }
  });

  console.log('\n\n🎉 Successfully pushed InsightAI v3.0 to GitHub!');
  console.log(`   🔗 https://github.com/Prasannaraj2k5/InsightAI`);
}

commitAndPush().catch(err => {
  console.error('\n❌ Push failed:', err.message || err);
  if (err.data) console.error('   Details:', JSON.stringify(err.data, null, 2));
  process.exit(1);
});
