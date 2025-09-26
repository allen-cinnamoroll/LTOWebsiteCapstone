# SSH Key Setup for GitHub Actions

## Generate SSH Key

### On your local machine:

```bash
# Generate a new SSH key
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# When prompted, save it as: ~/.ssh/hostinger_deploy
# Don't set a passphrase (press Enter twice)
```

### Add public key to your server:

```bash
# Copy the public key to your server
ssh-copy-id -i ~/.ssh/hostinger_deploy.pub root@YOUR-SERVER-IP

# Or manually add it:
cat ~/.ssh/hostinger_deploy.pub
# Copy this output and add it to: ~/.ssh/authorized_keys on your server
```

### Add private key to GitHub:

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `HOSTINGER_SSH_KEY`
5. Value: Copy the content of `~/.ssh/hostinger_deploy` (private key)

## Test the connection:

```bash
ssh -i ~/.ssh/hostinger_deploy root@YOUR-SERVER-IP
```
