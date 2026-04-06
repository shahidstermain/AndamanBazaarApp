#!/bin/bash
set -euo pipefail

# ============================================================
# AndamanBazaar FTP Deployment Script
# ============================================================

echo "============================================"
echo " AndamanBazaar — FTP Deployment"
echo "============================================"

# 1. Build the project
echo "→ Building the project..."
npm run build

# 2. Deploy via FTP
echo "→ Deploying to FTP..."
node -e "
const FtpDeploy = require('ftp-deploy');
const ftpDeploy = new FtpDeploy();

const config = {
  host: 'ftp.shahidster.site',
  port: 21,
  user: 'shahidster.site',
  password: '17Day11month!',
  localRoot: './dist',
  remoteRoot: '/public_html',
  include: ['*', '**/*'],
  exclude: ['node_modules', '.git', '.env', '*.log', 'coverage', 'reports', 'test-results', 'playwright-report'],
  deleteRemote: false,
  forcePassiveMode: true,
  sftp: false
};

ftpDeploy.deploy(config)
  .then(res => console.log('✅ FTP Deployment Complete!'))
  .catch(err => console.error('❌ FTP Deployment Error:', err));
"

echo ""
echo "============================================"
echo " ✓ Deployment process completed!"
echo "   Visit: https://shahidster.site"
echo "============================================"
