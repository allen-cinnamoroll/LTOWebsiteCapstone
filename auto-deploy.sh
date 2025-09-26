#!/bin/bash

# Auto-deploy script for LTO Website
# This script checks for updates and deploys automatically

cd /var/www/LTOWebsiteCapstone

# Check if there are new commits
git fetch origin

# Compare local and remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "New changes detected, deploying..."
    
    # Pull latest changes
    git pull origin main
    
    # Build frontend
    cd frontend
    npm run build
    
    # Restart backend
    pm2 restart lto-backend
    
    echo "Deployment completed!"
else
    echo "No new changes"
fi
