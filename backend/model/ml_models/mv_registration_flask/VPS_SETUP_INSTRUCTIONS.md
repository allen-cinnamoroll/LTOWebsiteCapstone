# VPS Setup Instructions - First Time Setup

The Flask application files need to be on your VPS. Here are your options:

## Option 1: Check Current Directory Structure on VPS

First, let's see what directory structure exists:

```bash
# Check if you're in the right base directory
pwd

# Check if the ml_models directory exists
ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/

# Check what's in the ml_models directory
ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/
```

**Send screenshot of these commands** so I can see the structure.

## Option 2: Create Directory Structure Manually

If the directories don't exist, create them:

```bash
# Navigate to the base directory
cd /var/www/LTOWebsiteCapstone

# Create the Flask app directory
mkdir -p backend/model/ml_models/mv_registration_flask

# Verify it was created
ls -la backend/model/ml_models/mv_registration_flask
```

## Option 3: Upload Files from Your Local Machine

You need to upload the Flask application files from your local machine to the VPS.

### Files to Upload:

- `app.py`
- `data_preprocessor.py`
- `sarima_model.py`
- `requirements.txt`
- `README.md`

### Upload Methods:

**Method A: Using SCP (from your local machine)**

```bash
# On your LOCAL machine (Windows), use PowerShell or Git Bash
scp backend/model/ml_models/mv_registration_flask/*.py root@YOUR_VPS_IP:/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/
scp backend/model/ml_models/mv_registration_flask/requirements.txt root@YOUR_VPS_IP:/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/
```

**Method B: Using Git (if your repository is synced)**

```bash
# On VPS
cd /var/www/LTOWebsiteCapstone
git pull origin main
```

**Method C: Using SFTP Client (FileZilla, WinSCP, etc.)**

1. Connect to your VPS via SFTP
2. Navigate to `/var/www/LTOWebsiteCapstone/backend/model/ml_models/`
3. Create `mv_registration_flask` directory if it doesn't exist
4. Upload all `.py` files and `requirements.txt`

## Quick Check Commands

Run these on your VPS to verify:

```bash
# Check current location
pwd

# Check if project exists
ls -la /var/www/LTOWebsiteCapstone/

# Check if backend directory exists
ls -la /var/www/LTOWebsiteCapstone/backend/

# Check ml_models directory
ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/
```

Send me the output of these commands!
