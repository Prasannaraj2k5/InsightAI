const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const repoDir = path.resolve(__dirname, '..');
const repoUrl = 'https://github.com/Prasannaraj2k5/InsightAI.git';

async function pushToGitHub() {
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    console.log(`
======================================================================
  ⚠️  GitHub Authentication Token Required to Push
======================================================================
  To push InsightAI files to https://github.com/Prasannaraj2k5/InsightAI,
  GitHub requires authentication via a Personal Access Token (PAT).

  Options to push:

  1. Run with token argument:
     node scripts/push-to-github.js <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>

  2. Run with environment variable:
     GITHUB_TOKEN="<YOUR_TOKEN>" npm run push

  3. Create a GitHub Personal Access Token if you don't have one:
     👉 https://github.com/settings/tokens (classic token with 'repo' scope)
======================================================================
`);
    process.exit(1);
  }

  console.log(`Pushing branch 'main' to ${repoUrl}...`);

  const pushResult = await git.push({
    fs,
    http,
    dir: repoDir,
    remote: 'origin',
    url: repoUrl,
    ref: 'main',
    onAuth: () => ({ username: token, password: '' }),
    onAuthSuccess: () => console.log('✅ Authentication successful!'),
    onAuthFailure: () => console.error('❌ Authentication failed. Please check your GitHub token permissions.'),
    onProgress: (evt) => {
      if (evt.phase) console.log(`⏳ ${evt.phase}: ${evt.loaded}/${evt.total || '?'}`);
    }
  });

  console.log('🎉 Successfully pushed InsightAI to GitHub!', pushResult);
}

pushToGitHub().catch(err => {
  console.error('Push error:', err.message || err);
  process.exit(1);
});
