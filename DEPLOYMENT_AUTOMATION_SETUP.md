# Automated Deployment Setup with GitHub Actions

This guide will help you set up automatic deployment so that whenever you push to the `main` branch, your code will automatically deploy to your VPS.

## Step 1: Generate SSH Key Pair (if you don't have one)

If you already have SSH keys set up, skip to Step 2.

**On your local machine:**

```bash
# Generate a new SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# This creates two files:
# - ~/.ssh/github_actions_deploy (private key - KEEP SECRET!)
# - ~/.ssh/github_actions_deploy.pub (public key)
```

## Step 2: Add Public Key to VPS

**Copy the public key:**

```bash
# On your local machine
cat ~/.ssh/github_actions_deploy.pub
```

**Add it to your VPS:**

```bash
# SSH into your VPS
ssh root@72.60.198.244

# Add the public key to authorized_keys
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## Step 3: Test SSH Connection

**On your local machine, test the connection:**

```bash
ssh -i ~/.ssh/github_actions_deploy root@72.60.198.244
```

If it connects without asking for a password, you're good to go!

## Step 4: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these three secrets:

### Secret 1: VPS_HOST
- **Name:** `VPS_HOST`
- **Value:** `72.60.198.244`

### Secret 2: VPS_USER
- **Name:** `VPS_USER`
- **Value:** `root`

### Secret 3: VPS_SSH_KEY
- **Name:** `VPS_SSH_KEY`
- **Value:** Copy the entire contents of your **private key**:
  ```bash
  # On your local machine
  cat ~/.ssh/github_actions_deploy
  ```
  Copy everything from `-----BEGIN OPENSSH PRIVATE KEY-----` to `-----END OPENSSH PRIVATE KEY-----`

## Step 5: Ensure Git is Set Up on VPS

**On your VPS, verify git is configured:**

```bash
cd /var/www/LTOWebsiteCapstone
git remote -v
# Should show your GitHub repository URL

# If not, add it:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
# Or if using SSH:
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
```

## Step 6: Test the Workflow

1. **Make a small change** (like updating a comment or README)
2. **Commit and push to main:**
   ```bash
   git add .
   git commit -m "Test automated deployment"
   git push origin main
   ```
3. **Check GitHub Actions:**
   - Go to your repository on GitHub
   - Click the **Actions** tab
   - You should see a workflow running
   - Click on it to see the deployment progress

## How It Works

1. **You push to `main` branch** → GitHub Actions triggers
2. **Actions runner** SSH into your VPS
3. **Runs all deployment commands** automatically:
   - Pull latest code
   - Fix permissions
   - Install dependencies
   - Build frontend
   - Restart backend
4. **Done!** Your site is updated

## Troubleshooting

### Workflow fails with "Permission denied"
- Make sure the SSH key is correctly added to GitHub secrets
- Verify the public key is in VPS `~/.ssh/authorized_keys`
- Check file permissions on VPS (should be 600 for authorized_keys)

### Workflow fails with "git pull failed"
- Make sure git is configured on VPS
- Check that the repository URL is correct
- Verify network connectivity from Actions runner to GitHub

### PM2 not found
- Make sure PM2 is installed globally: `npm install -g pm2`
- Or use full path: `/usr/local/bin/pm2 restart lto-backend`

### Sudo commands fail
- The workflow runs as the user you specified (root)
- If you need sudo, you might need to configure passwordless sudo or use a different approach

## Security Notes

⚠️ **Important:**
- Never commit your private SSH key to git
- Keep your GitHub secrets secure
- Consider using a dedicated deployment user instead of root
- Regularly rotate SSH keys

## Manual Deployment Still Available

Even with automation, you can still deploy manually if needed:
```bash
ssh root@72.60.198.244
cd /var/www/LTOWebsiteCapstone
# ... run your commands
```

## Next Steps

After setting this up:
1. Test it with a small change
2. Monitor the first few deployments
3. Adjust the workflow if needed
4. Enjoy automated deployments! 🎉

