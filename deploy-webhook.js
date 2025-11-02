#!/usr/bin/env node

const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const REPO_PATH = '/var/www/LTOWebsiteCapstone';

app.use(express.json());

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const calculatedSignature = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
}

// Deploy function
async function deploy() {
  console.log('🚀 Starting deployment...');
  
  try {
    // Pull latest changes
    console.log('📥 Pulling latest changes...');
    await execCommand('git pull origin main');
    
    // Ensure uploads directory exists
    console.log('📁 Creating uploads directory...');
    await execCommand('cd backend && mkdir -p uploads/avatars && chmod -R 755 uploads');
    
    // Install backend dependencies
    console.log('📦 Installing backend dependencies...');
    await execCommand('cd backend && npm install');
    
    // Install frontend dependencies and build
    console.log('🏗️ Building frontend...');
    await execCommand('cd frontend && npm install && npm run build');
    
    // Restart PM2 processes
    console.log('🔄 Restarting application...');
    await execCommand('pm2 restart lto-backend');
    
    console.log('✅ Deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

// Execute shell command
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: REPO_PATH }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
      } else {
        console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  
  if (!signature || !verifySignature(payload, signature)) {
    console.log('❌ Invalid signature');
    return res.status(401).send('Unauthorized');
  }
  
  if (req.body.ref === 'refs/heads/main') {
    console.log('📨 Received push to main branch, starting deployment...');
    deploy();
    res.status(200).send('Deployment started');
  } else {
    console.log('📨 Received push to non-main branch, ignoring');
    res.status(200).send('Ignored');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Webhook server is running');
});

app.listen(PORT, () => {
  console.log(`🎣 Webhook server listening on port ${PORT}`);
  console.log(`📡 Webhook URL: http://your-server-ip:${PORT}/webhook`);
});
