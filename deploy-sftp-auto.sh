#!/bin/bash
set -euo pipefail

# ============================================================
# AndamanBazaar SFTP Automated Deployment Script
# ============================================================

echo "============================================"
echo " AndamanBazaar — SFTP Deployment"
echo "============================================"

# 1. Build the project
echo "→ Building the project..."
npm run build

# 2. Deploy via SFTP using expect
echo "→ Deploying via SFTP..."

expect << 'EOF'
set timeout 300

# Connect to SFTP
spawn sftp shahidster.site@ssh.gb.stackcp.com

# Wait for password prompt
expect "password:"
send "17Day11month!\r"

# Wait for sftp prompt
expect "sftp>"

# Navigate to public_html/AndamanBazaarApp
send "cd /home/sites/30b/6/6ef8ba74fd/public_html/AndamanBazaarApp\r"
expect "sftp>"

# Upload all files recursively
send "put -r dist/*\r"
expect "sftp>"

# Verify upload
send "ls -la\r"
expect "sftp>"

# Exit
send "exit\r"
expect eof
EOF

echo ""
echo "============================================"
echo " ✓ Deployment complete!"
echo "   Visit: https://shahidster.site"
echo "============================================"
