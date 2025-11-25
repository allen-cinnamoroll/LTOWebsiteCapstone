# Automatic Deployment Setup for Hostinger VPS

This guide will help you set up automatic deployment from GitHub to your Hostinger VPS.

## Method 1: GitHub Webhooks (Recommended)

### Step 1: Set up the webhook server on your VPS

1. **Copy the webhook files to your server:**

```bash
# On your VPS
cd /var/www/LTOWebsiteCapstone
# Copy deploy-webhook.js and ecosystem.config.js to your server
```

2. **Install webhook dependencies:**

```bash
npm install express
```

3. **Update your PM2 ecosystem:**

```bash
# Replace the existing ecosystem.config.js with the new one
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### Step 2: Configure GitHub Webhook

1. **Go to your GitHub repository**
2. **Navigate to Settings → Webhooks**
3. **Click "Add webhook"**
4. **Configure the webhook:**
   - **Payload URL:** `http://your-server-ip:9000/webhook`
   - **Content type:** `application/json`
   - **Secret:** `LTO_Webhook_2024_Secure_Key_7x9m2k5p8q1r4s6t` (same as in ecosystem.config.js)
   - **Events:** Select "Just the push event"
   - **Active:** ✅

### Step 3: Configure Firewall

```bash
# Allow webhook port
sudo ufw allow 9000
```

### Step 4: Test the Setup

1. **Make a small change to your code**
2. **Commit and push to GitHub:**

```bash
git add .
git commit -m "Test automatic deployment"
git push origin main
```

3. **Check the webhook logs:**

```bash
pm2 logs deploy-webhook
```

## Method 2: GitHub Actions (Alternative)

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to Hostinger VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOSTINGER_IP }}
          username: ${{ secrets.HOSTINGER_USER }}
          key: ${{ secrets.HOSTINGER_SSH_KEY }}
          script: |
            cd /var/www/LTOWebsiteCapstone
            git pull origin main
            cd backend && npm install
            cd ../frontend && npm install && npm run build
            pm2 restart lto-backend
```

### Step 2: Add GitHub Secrets

In your GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Add these secrets:
   - `HOSTINGER_IP`: Your VPS IP address
   - `HOSTINGER_USER`: Your VPS username (usually `lto`)
   - `HOSTINGER_SSH_KEY`: Your private SSH key

## Method 3: Simple Cron Job (Basic)

### Set up a cron job to check for updates every few minutes:

```bash
# Edit crontab
crontab -e

# Add this line to check every 5 minutes
*/5 * * * * cd /var/www/LTOWebsiteCapstone && git pull origin main && pm2 restart lto-backend
```

## Troubleshooting

### Check webhook status:

```bash
pm2 status
pm2 logs deploy-webhook
```

### Test webhook manually:

```bash
curl -X POST http://localhost:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=your-signature" \
  -d '{"ref":"refs/heads/main"}'
```

### Check deployment logs:

```bash
pm2 logs lto-backend
```

## Security Notes

1. **Change the webhook secret** in `ecosystem.config.js`
2. **Use HTTPS** for production (set up SSL certificate)
3. **Restrict webhook access** by IP if possible
4. **Monitor webhook logs** regularly

## Benefits of Each Method

### GitHub Webhooks:

- ✅ Immediate deployment
- ✅ Secure with signature verification
- ✅ No external dependencies
- ❌ Requires open port

### GitHub Actions:

- ✅ No open ports needed
- ✅ Built-in security
- ✅ Detailed logs
- ❌ Requires SSH key setup

### Cron Job:

- ✅ Simple setup
- ✅ No external dependencies
- ❌ Not immediate
- ❌ Less secure

## Recommended Approach

For your LTO Website project, I recommend **GitHub Webhooks** because:

1. It's immediate (deploys as soon as you push)
2. It's secure with signature verification
3. It's easy to monitor and debug
4. It works well with your existing PM2 setup
