# LTO Website Deployment Guide - Hostinger KVM 2 VPS

This guide will help you deploy your LTO Website project on Hostinger KVM 2 VPS running Ubuntu 24.04.3 LTS.

## Prerequisites

- Hostinger KVM 2 VPS with Ubuntu 24.04.3 LTS
- Domain name pointing to your VPS IP
- SSH access to your VPS
- Basic knowledge of Linux commands

## Table of Contents

1. [Initial Server Setup](#1-initial-server-setup)
2. [Install Required Software](#2-install-required-software)
3. [Database Setup](#3-database-setup)
4. [Application Deployment](#4-application-deployment)
5. [Web Server Configuration](#5-web-server-configuration)
6. [SSL Certificate Setup](#6-ssl-certificate-setup)
7. [Process Management](#7-process-management)
8. [Security Configuration](#8-security-configuration)
9. [Monitoring and Maintenance](#9-monitoring-and-maintenance)

## 1. Initial Server Setup

### Connect to your VPS

```bash
ssh root@your-vps-ip
```

### Update system packages

```bash
apt update && apt upgrade -y
```

### Create a non-root user (recommended)

```bash
adduser lto
usermod -aG sudo lto
su - lto
```

### Configure firewall

```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 2. Install Required Software

### Install Node.js (using NodeSource repository)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install Python 3 and pip

```bash
sudo apt install python3 python3-pip python3-venv -y
```

### Install MongoDB

```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## 3. Database Setup

### Configure MongoDB

```bash
sudo nano /etc/mongod.conf
```

Update the configuration:

Replace the entire content with this minimal configuration:
net:
port: 27017
bindIp: 127.0.0.1

# storage

storage:
dbPath: /var/lib/mongodb

# systemLog

systemLog:
destination: file
path: /var/log/mongodb/mongod.log

````

### Create MongoDB admin user

```bash
mongosh
````

add this:

nano /etc/mongod.conf

Add this line to the config file:

# network interfaces

net:
port: 27017
bindIp: 127.0.0.1

# storage

storage:
dbPath: /var/lib/mongodb

# systemLog

systemLog:
destination: file
path: /var/log/mongodb/mongod.log

# security

security:
authorization: enabled

save the file and restart:
systemctl restart mongod
systemctl status mongod

In MongoDB shell:

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "3-JAKofAlltrades",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
exit
```

### Create application database and user

```bash
mongosh -u admin -p 3-JAKofAlltrades --authenticationDatabase admin
```

In MongoDB shell:

```javascript
use lto_website
db.createUser({
  user: "lto_user",
  pwd: "jessa_allen_kent",
  roles: ["readWrite"]
})
exit
```

mongosh -u lto_user -p jessa_allen_kent --authenticationDatabase admin

## 4. Application Deployment

### Clone your repository

```bash
cd /var/www
sudo git clone https://github.com/your-username/LTOWebsiteCapstone.git
sudo /var/www/LTOWebsiteCapstone
cd /var/www/LTOWebsiteCapstone
```

### Backend Setup

```bash
cd backend
npm install
```

Create environment file:

```bash
nano .env
```

Add the following content:

```env
NODE_ENV=production
PORT=5000
DATABASE=mongodb://lto_user:your_app_password@localhost:27017/lto_website?authSource=lto_website
DB_PASSWORD=your_app_password
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**Create uploads directory with proper permissions:**

```bash
# Create uploads directory structure
mkdir -p uploads/avatars

# Set proper ownership (replace 'lto' with your server user)
sudo chown -R lto:lto uploads

# Set proper permissions
chmod -R 755 uploads

# Verify directory was created
ls -la uploads/
```

### Frontend Setup

```bash
cd ../frontend
npm install
npm run build
```

**If you encounter permission errors during build, clear npm cache and reinstall:**

```bash
cd /var/www/LTOWebsiteCapstone/frontend
rm -rf node_modules
rm -rf package-lock.json
npm cache clean --force
npm install
npm run build
```

### Python ML Dependencies

```bash
cd ../backend/model/ml_models/training
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**If you encounter error:**

open:
nano requirements.txt
replace:
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.3.0
joblib>=1.3.0
pyyaml>=6.0
matplotlib>=3.7.0
seaborn>=0.12.0

install again: pip install -r requirements.txt

## 5. Web Server Configuration

### Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/lto-website
```

Add the following configuration:

```nginx
server {
    listen 80;
    #server_name your-domain.com www.your-domain.com;

    # Increase file upload size limit to 10MB (to accommodate 5MB avatar files + overhead)
    client_max_body_size 10M;

    # Frontend (React app)
    location / {
        root /var/www/LTOWebsiteCapstone/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Serve uploaded files (avatars, etc.)
    location /uploads {
        alias /var/www/LTOWebsiteCapstone/backend/uploads;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Important: Allow large file uploads through the proxy
        client_max_body_size 10M;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/lto-website /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL Certificate Setup

### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtain SSL certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Auto-renewal setup

```bash
sudo crontab -e
```

Add this line:

```
0 12 * * * /usr/bin/certbot renew --quiet
```

## 7. Process Management

### Create PM2 ecosystem file

```bash
nano /var/www/LTOWebsiteCapstone/ecosystem.config.js
```

Add the following content:

```javascript
module.exports = {
  apps: [
    {
      name: "lto-backend",
      script: "server.js",
      cwd: "/var/www/LTOWebsiteCapstone/backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "/var/log/pm2/lto-backend-error.log",
      out_file: "/var/log/pm2/lto-backend-out.log",
      log_file: "/var/log/pm2/lto-backend.log",
      time: true,
    },
  ],
};
```

### Start application with PM2

```bash
cd /var/www/LTOWebsiteCapstone
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 8. Security Configuration

### Configure MongoDB security

```bash
sudo nano /etc/mongod.conf
```

Ensure these settings:

```yaml
security:
  authorization: enabled
net:
  bindIp: 127.0.0.1
```

### Set up fail2ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Configure automatic security updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 9. Monitoring and Maintenance

### Set up log rotation

```bash
sudo nano /etc/logrotate.d/lto-website
```

Add:

```
/var/log/pm2/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 lto lto
}
```

### Create backup script

```bash
nano /home/lto/backup.sh
```

Add:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db lto_website --out /home/lto/backups/mongodb_$DATE
tar -czf /home/lto/backups/app_$DATE.tar.gz /var/www/LTOWebsiteCapstone
find /home/lto/backups -name "*.tar.gz" -mtime +7 -delete
```

Make it executable:

```bash
chmod +x /home/lto/backup.sh
```

### Set up automated backups

```bash
crontab -e
```

Add:

```
0 2 * * * /home/lto/backup.sh
```

## Deployment Commands Summary

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx mongodb-org python3 python3-pip

# 3. Clone and setup application
cd /var/www
sudo git clone https://github.com/your-username/LTOWebsiteCapstone.git
sudo chown -R lto:lto /var/www/LTOWebsiteCapstone
cd /var/www/LTOWebsiteCapstone

# 4. Backend setup
cd backend
npm install
# Configure .env file

# 5. Frontend setup
cd ../frontend
npm install
npm run build

# 6. Python ML setup
cd ../backend/model/ml_models/training
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 7. Configure Nginx
sudo nano /etc/nginx/sites-available/lto-website
sudo ln -s /etc/nginx/sites-available/lto-website /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 8. Setup SSL
sudo certbot --nginx -d your-domain.com

# 9. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Troubleshooting

### Check application status

```bash
pm2 status
pm2 logs lto-backend
```

### Check Nginx status

```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check MongoDB status

```bash
sudo systemctl status mongod
```

### View logs

```bash
sudo tail -f /var/log/nginx/error.log
pm2 logs lto-backend
```

## Important Notes

1. **Environment Variables**: Make sure all environment variables in `.env` are properly configured
2. **Database Security**: Use strong passwords for MongoDB users
3. **SSL Certificate**: Ensure your domain is properly configured and SSL certificate is valid
4. **Firewall**: Only open necessary ports (22, 80, 443)
5. **Backups**: Regularly backup your database and application files
6. **Updates**: Keep your system and dependencies updated
7. **Monitoring**: Set up monitoring for your application and server resources

## Support

If you encounter any issues during deployment, check:

- Application logs: `pm2 logs lto-backend`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`
- System logs: `sudo journalctl -u nginx` or `sudo journalctl -u mongod`
