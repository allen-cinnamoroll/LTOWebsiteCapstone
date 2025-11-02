# Quick Fix: Update requirements.txt on VPS

## Option 1: Pull from GitHub (Recommended)

```bash
cd /var/www/LTOWebsiteCapstone
git pull origin main
cd backend/model/ml_models/mv_registration_flask
```

## Option 2: Manually Edit on VPS

If git pull doesn't work, manually update the file:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
nano requirements.txt
```

Replace the contents with:

```
Flask==3.0.0
flask-cors==4.0.0
pandas>=2.1.0
numpy>=1.26.0
statsmodels>=0.14.0
scipy>=1.11.0
setuptools>=65.0.0
```

Save with Ctrl+X, then Y, then Enter.

## Then Install Again

```bash
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```
