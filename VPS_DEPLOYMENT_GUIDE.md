# VPS Deployment Guide - O.B.Mighty

## Pre-Deployment Checklist

- [ ] VPS SSH access configured
- [ ] Domain name pointing to VPS IP
- [ ] PHP 8.1+ installed with required extensions
- [ ] MySQL/MariaDB running
- [ ] Nginx or Apache web server installed
- [ ] Git installed on VPS
- [ ] Composer installed on VPS

---

## Step 1: Connect to VPS via SSH

```bash
ssh root@your_vps_ip
# or if using a specific key
ssh -i /path/to/key.pem root@your_vps_ip
```

---

## Step 2: Install Dependencies (If Not Already Done)

### Install PHP and Required Extensions
```bash
# Update system
apt update && apt upgrade -y

# Install PHP 8.1 with extensions
apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-mysql php8.1-mbstring \
    php8.1-xml php8.1-curl php8.1-zip php8.1-bcmath php8.1-json php8.1-gd

# Verify PHP installation
php -v
```

### Install MySQL/MariaDB
```bash
apt install -y mysql-server

# Start MySQL service
systemctl start mysql
systemctl enable mysql

# Secure MySQL installation
mysql_secure_installation
```

### Install Nginx
```bash
apt install -y nginx

# Start Nginx
systemctl start nginx
systemctl enable nginx

# Verify status
systemctl status nginx
```

### Install Composer
```bash
curl -sS https://getcomposer.org/installer -o composer-setup.php
php composer-setup.php --install-dir=/usr/local/bin --filename=composer

# Verify installation
composer --version
```

### Install Git
```bash
apt install -y git
```

---

## Step 3: Create Application Directory

```bash
# Choose your deployment location (e.g., /var/www)
cd /var/www

# Create project directory
mkdir obmighty
cd obmighty

# Create subdirectories for frontend and backend
mkdir contribution-backend
mkdir contribution-frontend
```

---

## Step 4: Clone/Deploy Backend Code

### Option A: Clone from Git Repository
```bash
cd /var/www/obmighty/contribution-backend

# Clone the repository
git clone https://github.com/your-username/obmighty.git .
# or if you have specific branch
git clone -b master https://github.com/your-username/obmighty.git .
```

### Option B: Upload via SFTP
```bash
# On your local machine
sftp root@your_vps_ip
# Then navigate and upload files
```

---

## Step 5: Install Backend Dependencies

```bash
cd /var/www/obmighty/contribution-backend

# Install composer dependencies
composer install --optimize-autoloader --no-dev

# Generate application key
php artisan key:generate
```

---

## Step 6: Configure Environment Variables

### Create .env file for Production
```bash
# Copy the example env file
cp .env.example .env

# Edit for production
nano .env
```

### Update .env with Production Values

```dotenv
APP_NAME="O.B.Mighty Contribution Manager"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com  # Your actual domain

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=obmighty_prod
DB_USERNAME=obmighty_user
DB_PASSWORD=secure_password_here

# Cache
CACHE_DRIVER=redis  # or file if no redis
QUEUE_CONNECTION=database  # or redis

# Session
SESSION_DRIVER=database
SESSION_DOMAIN=yourdomain.com
SESSION_SECURE_COOKIE=true

# CORS Settings (add your frontend domain)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Sanctum
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com

# Mail (if using)
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=465
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
```

**Note:** Replace `yourdomain.com`, `secure_password_here`, etc. with your actual values.

---

## Step 7: Setup Database

### Create Database and User
```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE obmighty_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'obmighty_user'@'localhost' IDENTIFIED BY 'secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON obmighty_prod.* TO 'obmighty_user'@'localhost';

# Apply changes
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### Run Migrations
```bash
cd /var/www/obmighty/contribution-backend

# Run all migrations
php artisan migrate --force

# Seed initial data (optional)
php artisan db:seed --class=DatabaseSeeder

# Seed sample data for testing (optional)
php artisan db:seed --class=SampleDataSeeder
```

---

## Step 8: Set File Permissions

```bash
cd /var/www/obmighty

# Set ownership to web server user
sudo chown -R www-data:www-data contribution-backend
sudo chown -R www-data:www-data contribution-frontend

# Set correct permissions
chmod -R 755 contribution-backend
chmod -R 755 contribution-frontend

# Make storage and bootstrap cache writable
chmod -R 775 contribution-backend/storage
chmod -R 775 contribution-backend/bootstrap/cache

# Set proper permissions for bootstrap/cache
sudo chown -R www-data:www-data contribution-backend/storage
sudo chown -R www-data:www-data contribution-backend/bootstrap/cache
```

---

## Step 9: Create Storage Symbolic Link

```bash
cd /var/www/obmighty/contribution-backend

# Create symbolic link for file storage
php artisan storage:link

# Verify it was created
ls -la public/
# Should show: storage -> ../storage/app/public
```

---

## Step 10: Deploy Frontend

### Option A: Build Frontend Locally, Upload Built Files
```bash
# On your local machine
cd contribution-frontend

# Install dependencies
npm install

# Build for production
npm run build

# Upload 'dist' folder to VPS via SFTP
```

### Option B: Build on VPS
```bash
# On VPS
cd /var/www/obmighty/contribution-frontend

# Install Node.js and npm (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Build application
NODE_ENV=production npm run build

# Verify build output
ls -la dist/
```

---

## Step 11: Configure Nginx

### Create Nginx Configuration File
```bash
cd /etc/nginx/sites-available

sudo nano obmighty

# Paste the configuration below
```

### Nginx Configuration Template

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/obmighty_access.log;
    error_log /var/log/nginx/obmighty_error.log;

    # Root directory for Laravel public folder
    root /var/www/obmighty/contribution-backend/public;
    index index.php;

    # Increase upload limit
    client_max_body_size 100M;

    # Frontend SPA routing
    location / {
        # Try file, then directory, then frontend
        try_files $uri $uri/ /index.php?$query_string;
    }

    # API routes
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Storage link
    location /storage {
        try_files $uri $uri/ =404;
    }

    # PHP-FPM Configuration
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to .env and other sensitive files
    location ~ /\.env {
        deny all;
    }

    location ~ /\. {
        deny all;
    }
}
```

### Enable Nginx Configuration
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/obmighty /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 12: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx --email your-email@example.com \
    -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically update Nginx config

# Auto-renewal is set up by default
# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## Step 13: Install and Configure PHP-FPM

```bash
# Check if PHP-FPM is running
systemctl status php8.1-fpm

# Start and enable PHP-FPM
sudo systemctl start php8.1-fpm
sudo systemctl enable php8.1-fpm

# Check socket exists
ls -la /run/php/php8.1-fpm.sock
```

---

## Step 14: Clear Cache and Optimize

```bash
cd /var/www/obmighty/contribution-backend

# Clear application cache
php artisan cache:clear

# Clear configuration cache
php artisan config:clear

# Create optimized configuration cache (production only)
php artisan config:cache

# Cache routes (production only)
php artisan route:cache

# Cache views (optional)
php artisan view:cache

# Optimize autoloader (production only)
composer install --optimize-autoloader --no-dev
```

---

## Step 15: Setup Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/obmighty

# Paste this configuration:
```

```
/var/www/obmighty/contribution-backend/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
        systemctl reload php8.1-fpm > /dev/null 2>&1 || true
    endscript
}
```

---

## Step 16: Test Deployment

### Test Backend API
```bash
# Test your API endpoint
curl https://yourdomain.com/api/health

# Or check a specific endpoint (you may need to create a health check route)
curl https://yourdomain.com/api/config
```

### Test Frontend
```bash
# Visit your domain in browser
https://yourdomain.com

# Check browser console for any errors
# Check Network tab for API calls
```

### Check PHP-FPM
```bash
# Verify PHP-FPM is processing requests
ps aux | grep php

# Check error logs
tail -f /var/log/php8.1-fpm.log
```

### Check Nginx Logs
```bash
# Check access logs
tail -f /var/log/nginx/obmighty_access.log

# Check error logs
tail -f /var/log/nginx/obmighty_error.log
```

---

## Step 17: Setup Monitoring and Backups

### Create Backup Script
```bash
sudo nano /usr/local/bin/obmighty-backup.sh

# Paste this script:
```

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/obmighty"
DB_NAME="obmighty_prod"
DB_USER="obmighty_user"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup application
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/obmighty/

# Keep only last 7 days of backups  
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Make Script Executable
```bash
sudo chmod +x /usr/local/bin/obmighty-backup.sh

# Run backup
sudo /usr/local/bin/obmighty-backup.sh

# Schedule daily backups with cron
sudo crontab -e
# Add this line:
# 2 3 * * * /usr/local/bin/obmighty-backup.sh > /var/log/obmighty_backup.log 2>&1
```

---

## Step 18: Setup Monitoring (Optional)

### Monitor System Resources
```bash
# Install monitoring tools
apt install -y htop iotop

# Check system stats
htop

# Check PHP-FPM status
php-fpm -v
systemctl status php8.1-fpm
```

### Monitor Application Logs
```bash
# Real-time log monitoring
tail -f /var/www/obmighty/contribution-backend/storage/logs/laravel.log

# Search logs
grep -i "error" /var/www/obmighty/contribution-backend/storage/logs/laravel.log | tail -20
```

---

## Troubleshooting

### 502 Bad Gateway Error
```bash
# Check PHP-FPM is running
systemctl status php8.1-fpm

# Restart PHP-FPM
systemctl restart php8.1-fpm

# Check socket permissions
ls -la /run/php/php8.1-fpm.sock
```

### Database Connection Error
```bash
# Verify credentials in .env
cat /var/www/obmighty/contribution-backend/.env | grep DB_

# Test MySQL connection
mysql -u obmighty_user -p olmighty_prod

# Check MySQL is running
systemctl status mysql
```

### File Permissions Error
```bash
# Fix storage permissions
sudo chown -R www-data:www-data /var/www/obmighty/contribution-backend/storage
chmod -R 775 /var/www/obmighty/contribution-backend/storage

# Fix bootstrap cache
sudo chown -R www-data:www-data /var/www/obmighty/contribution-backend/bootstrap/cache
chmod -R 775 /var/www/obmighty/contribution-backend/bootstrap/cache
```

### Nginx Configuration Error
```bash
# Test Nginx configuration
sudo nginx -t

# View error details
sudo journalctl -u nginx -n 50
```

### API CORS Errors
```bash
# Verify .env CORS_ALLOWED_ORIGINS
cat /var/www/obmighty/contribution-backend/.env | grep CORS

# Update if needed
nano /var/www/obmighty/contribution-backend/.env

# Clear cache
php artisan config:clear
php artisan config:cache
```

---

## Post-Deployment Checklist

- [ ] Domain is pointing to VPS
- [ ] SSL certificate is valid and auto-renewing
- [ ] API is responding at https://yourdomain.com/api/config
- [ ] Frontend loads at https://yourdomain.com
- [ ] Login works with test credentials
- [ ] Dashboard shows data
- [ ] File uploads work (logo, images)
- [ ] Logs are being written
- [ ] Backup script is running
- [ ] Email may be configured (optional)
- [ ] Performance is acceptable

---

## Performance Optimization Tips

### Enable Redis Caching (Optional)
```bash
# Install Redis
apt install -y redis-server

# Start Redis
systemctl start redis-server
systemctl enable redis-server

# Update .env
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Install Laravel Redis package
composer require predis/predis
```

### Enable Query Caching
```bash
# Add to .env
QUERY_CACHE_ENABLED=true
```

### Disable Debug Mode in Production
```bash
# In .env
APP_DEBUG=false
```

---

## Important Environment Variables Summary

| Variable | Value | Notes |
|----------|-------|-------|
| `APP_ENV` | `production` | Must be production |
| `APP_DEBUG` | `false` | Never true in production |
| `APP_URL` | `https://yourdomain.com` | Use HTTPS |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `SESSION_SECURE_COOKIE` | `true` | Only HTTPS |
| `CORS_ALLOWED_ORIGINS` | Your domain | Must include frontend domain |

---

## Useful Commands for VPS Management

```bash
# Restart all services
sudo systemctl restart nginx php8.1-fpm mysql

# Check service status
sudo systemctl status nginx && systemctl status php8.1-fpm && systemctl status mysql

# View real-time logs
tail -f /var/www/obmighty/contribution-backend/storage/logs/laravel.log

# Clear all caches
php artisan optimize:clear

# Run migrations
php artisan migrate

# SSH into server
ssh root@your_vps_ip

# Upload files via SCP
scp -r /local/path root@your_vps_ip:/remote/path
```

---

## Security Hardening (Optional)

```bash
# Setup firewall
apt install -y ufw

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Disable root login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Restart SSH
systemctl restart sshd
```

---

## Deployment Complete! 🎉

Your application is now deployed and running on your VPS. Make sure to:
1. Monitor logs regularly
2. Backup data daily
3. Keep SSL certificates updated
4. Review error logs for issues
5. Test new features on staging before production

For questions or issues, check the `storage/logs/laravel.log` file.
