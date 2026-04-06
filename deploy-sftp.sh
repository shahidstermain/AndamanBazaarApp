#!/bin/bash
set -euo pipefail

# ============================================================
# AndamanBazaar SFTP Deployment Script
# ============================================================

echo "============================================"
echo " AndamanBazaar — SFTP Deployment"
echo "============================================"

# 1. Build the project
echo "→ Building the project..."
npm run build

# 2. Deploy via SFTP
echo "→ Deploying via SFTP..."
node -e "
const FtpDeploy = require('ftp-deploy');
const ftpDeploy = new FtpDeploy();

const config = {
  host: 'ssh.gb.stackcp.com',
  port: 22,
  user: 'shahidster.site',
  password: '17Day11month!',
  localRoot: './dist',
  remoteRoot: '/public_html',
  include: ['*', '**/*'],
  exclude: ['node_modules', '.git', '.env', '*.log', 'coverage', 'reports', 'test-results', 'playwright-report'],
  deleteRemote: false,
  forcePassiveMode: true,
  sftp: true
};

ftpDeploy.deploy(config)
  .then(res => console.log('✅ SFTP Deployment Complete!'))
  .catch(err => console.error('❌ SFTP Deployment Error:', err));
"

echo ""
echo "============================================"
echo " ✓ Deployment process completed!"
echo "   Visit: https://shahidster.site"
echo "============================================"
