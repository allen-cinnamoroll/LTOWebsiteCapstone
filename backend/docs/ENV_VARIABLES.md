# Environment Variables Configuration

This document describes all environment variables used in the frontend application.

## Required Environment Variables

### VITE_BASE_URL
**Description:** Backend API base URL  
**Development:** `http://localhost:5000/api`  
**Production:** `https://ltodatamanager.com/api`  

**Usage:** This is the main backend API URL used by axios for all API calls. Avatar images and uploads will automatically use this URL with the `/api` suffix removed.

Example:
```env
VITE_BASE_URL=https://ltodatamanager.com/api
```

### VITE_ACCIDENT_PRED_API
**Description:** Accident Prediction Flask API URL  
**Development:** `http://localhost:5004`  
**Production:** `https://ltodatamanager.com/accident-prediction-api`  

**Usage:** Used by the Accident Prediction Model page and Accident Analytics to fetch predictions.

Example:
```env
VITE_ACCIDENT_PRED_API=https://ltodatamanager.com/accident-prediction-api
```

### VITE_MV_PREDICTION_API_URL
**Description:** MV (Motor Vehicle) Prediction Flask API URL  
**Development:** `http://localhost:5002`  
**Production:** `https://ltodatamanager.com/mv-prediction-api`  

**Usage:** Used by the Vehicle Model page for SARIMA predictions.

Example:
```env
VITE_MV_PREDICTION_API_URL=https://ltodatamanager.com/mv-prediction-api
```

## How Avatar URLs Work

The system automatically constructs avatar URLs from `VITE_BASE_URL`:

1. Takes `VITE_BASE_URL` (e.g., `https://ltodatamanager.com/api`)
2. Removes the `/api` suffix to get backend base URL
3. Appends the avatar path from JWT token

**Example:**
- `VITE_BASE_URL` = `https://ltodatamanager.com/api`
- Backend base = `https://ltodatamanager.com`
- Avatar path from JWT = `uploads/avatars/avatar-123.jpg`
- Final avatar URL = `https://ltodatamanager.com/uploads/avatars/avatar-123.jpg`

This ensures no mixed content warnings in production (HTTPS).

## Development Setup

Create a `.env` file in the `frontend/` directory:

```env
VITE_BASE_URL=http://localhost:5000/api
VITE_ACCIDENT_PRED_API=http://localhost:5004
VITE_MV_PREDICTION_API_URL=http://localhost:5002
```

## Production Setup

For production deployment, set these environment variables:

```env
VITE_BASE_URL=https://ltodatamanager.com/api
VITE_ACCIDENT_PRED_API=https://ltodatamanager.com/accident-prediction-api
VITE_MV_PREDICTION_API_URL=https://ltodatamanager.com/mv-prediction-api
```

## Troubleshooting

### Mixed Content Warnings
If you see "Mixed Content" warnings about HTTP resources on HTTPS pages:
- Check that `VITE_BASE_URL` uses `https://` in production
- Verify avatar URLs don't contain hardcoded `http://localhost` URLs
- Ensure all Flask APIs are accessible via HTTPS or reverse proxy

### JSON Parse Errors
If you see "Unexpected token '<', '<!doctype'..." errors:
- The Flask API is not running or not accessible
- The URL in environment variable is incorrect
- Check that the Flask API is running on the specified port
- Verify nginx/reverse proxy configuration if using one

