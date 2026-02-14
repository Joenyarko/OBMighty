# Hostinger VPS Deployment Checklist - O.B.Mighty

## Your Setup
- **Domain:** neziz.cloud
- **API Subdomain:** api.neziz.cloud
- **Backend Location:** `/var/www/neziz/contribution-backend`
- **Server:** Hostinger VPS

---

## ✅ Pre-Deployment Verification

### 1. DNS Configuration
- [ ] `neziz.cloud` A record points to your VPS IP
- [ ] `api.neziz.cloud` A record points to your VPS IP (or CNAME to main domain)
- [ ] DNS propagated (can take 24-48 hours)

**Verify:**
```bash
nslookup api.neziz.cloud
# Should show your VPS IP
```

### 2. SSL Certificates
- [ ] SSL certificate for api.neziz.cloud issued
- [ ] SSL certificate for neziz.cloud issued
- [ ] Auto-renewal configured

**Verify:**
```bash
sudo certbot certificates
# Should show both domains with expiry dates
```

### 3. Web Server (Nginx)
- [ ] Nginx installed and running
- [ ] Config for api.neziz.cloud points to `/var/www/neziz/contribution-backend/public`
- [ ] Config for neziz.cloud points to frontend build directory
- [ ] PHP-FPM socket configured correctly

**Verify:**
```bash
sudo systemctl status nginx
sudo nginx -t  # Check config syntax
```

---

## ✅ Backend Setup

### 4. PHP Installation
- [ ] PHP 8.1+ installed
- [ ] Required extensions: php-json, php-bcmath, php-ctype, php-curl, php-dom, php-fileinfo, php-filter, php-hash, php-mbstring, php-openssl, php-pdo, php-tokenizer, php-xml
- [ ] PHP-FPM running

**Verify:**
```bash
php --version
php -m | grep -i mysql
sudo systemctl status php8.2-fpm
```

### 5. Database Setup
- [ ] MySQL/MariaDB installed and running
- [ ] Database `contribution_db` created
- [ ] Database user `contribution` created with password
- [ ] User has all privileges on the database

**Verify:**
```bash
mysql -u contribution -p
# Enter password, then:
SHOW DATABASES;
USE contribution_db;
SHOW TABLES;
```

### 6. Laravel Installation
- [ ] Composer dependencies installed: `composer install --no-dev`
- [ ] `.env` file configured (see below)
- [ ] `APP_KEY` generated: `php artisan key:generate`
- [ ] Database migrations run: `php artisan migrate`
- [ ] Storage linked: `php artisan storage:link`
- [ ] Caches cleared: `php artisan cache:clear`

**Verify:**
```bash
cd /var/www/neziz/contribution-backend
php artisan migrate --force
php artisan cache:clear
php artisan config:clear
```

### 7. File Permissions
- [ ] Storage directory writable: `sudo chown -R www-data:www-data storage/`
- [ ] Bootstrap cache writable: `sudo chown -R www-data:www-data bootstrap/cache/`
- [ ] .env permissions: `sudo chmod 600 .env`

**Verify:**
```bash
ls -la storage/  # www-data owner
ls -la bootstrap/cache/  # www-data owner
```

---

## ✅ Environment Configuration

### 8. Create/Update .env File

```bash
# SSH into server
ssh user@neziz.cloud
cd /var/www/neziz/contribution-backend

# Create .env (copy from .env.example if exists)
cp .env.example .env

# Edit .env with these values:
nano .env
```

**Required .env variables:**
```
APP_NAME=OBMighty
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.neziz.cloud
APP_TIMEZONE=UTC

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=contribution_db
DB_USERNAME=contribution
DB_PASSWORD=your_strong_password

# Cache & Session (use file initially, upgrade to Redis later)
CACHE_DRIVER=file
SESSION_DRIVER=cookie
QUEUE_CONNECTION=sync

# Mail (configure later)
MAIL_FROM_ADDRESS=noreply@neziz.cloud
MAIL_FROM_NAME="${APP_NAME}"

# Frontend URL (for CORS)
FRONTEND_URL=https://neziz.cloud

# Sanctum
SANCTUM_STATEFUL_DOMAINS=api.neziz.cloud
```

### 9. Generate App Key
```bash
cd /var/www/neziz/contribution-backend
php artisan key:generate
```

---

## ✅ Testing & Verification

### 10. Test API Health

```bash
# Test configuration endpoint (public)
curl https://api.neziz.cloud/api/config

# Should return 200 OK with JSON
```

### 11. Test Database Connection

```bash
cd /var/www/neziz/contribution-backend
php artisan tinker

# In tinker:
> DB::connection()->getPdo()
# Should return PDO object

> User::count()
# Should return number of users
```

### 12. Test Login Endpoint

```bash
# Create test user first (if not exists)
php artisan tinker
> App\Models\User::factory()->create(['email' => 'test@test.com', 'password' => bcrypt('password123')])

# Now test login
curl -X POST https://api.neziz.cloud/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123"
  }'

# Should return token and user data
```

### 13. Test Protected Route

```bash
# Use token from login response
curl -X GET https://api.neziz.cloud/api/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Should return current user
```

---

## ✅ Frontend Setup

### 14. Build Frontend

```bash
cd /var/www/neziz/contribution-frontend

# Install dependencies
npm install

# Build for production
npm run build

# Verify build output
ls -la dist/
```

### 15. Configure Nginx for Frontend

```bash
# Create Nginx config for frontend
sudo nano /etc/nginx/sites-available/neziz.cloud
```

**Config:**
```nginx
server {
    server_name neziz.cloud;
    root /var/www/neziz/contribution-frontend/dist;
    
    index index.html index.htm;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/html text/plain text/css text/javascript application/json application/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing: send all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # SSL configuration
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/neziz.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neziz.cloud/privkey.pem;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name neziz.cloud;
    return 301 https://$server_name$request_uri;
}
```

### 16. Update Frontend API URL

The frontend must know the API URL. Check if environment variable is set in frontend build:

```bash
# Before building, set environment
export REACT_APP_API_URL=https://api.neziz.cloud/api

# Then rebuild
npm run build
```

**Or in code:**
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://api.neziz.cloud/api';
```

---

## ✅ Performance Optimization

### 17. Enable Caching

```bash
cd /var/www/neziz/contribution-backend

# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Optimize autoloader
composer install --no-dev --optimize-autoloader
```

### 18. Enable Gzip Compression

Add to Nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

---

## ✅ Monitoring & Logs

### 19. Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/obm

# Add:
/var/www/neziz/contribution-backend/storage/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

### 20. Monitor Error Logs

```bash
# Real-time backend logs
tail -f /var/www/neziz/contribution-backend/storage/logs/laravel.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## ✅ Security

### 21. Firewall Rules

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 22. Disable Debug Mode

In `.env`:
```
APP_DEBUG=false
```

### 23. Secure .env File

```bash
sudo chmod 600 /var/www/neziz/contribution-backend/.env
sudo chown www-data:www-data /var/www/neziz/contribution-backend/.env
```

---

## ✅ Backup Strategy

### 24. Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u contribution -p'password' contribution_db > /backups/db_$DATE.sql
gzip /backups/db_$DATE.sql

# Make executable
chmod +x /usr/local/bin/backup-db.sh

# Add to cron (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

### 25. Files Backup

```bash
# Backup to external service or local
rsync -av /var/www/neziz/ /backups/neziz/
```

---

## ✅ Final Verification Checklist

- [ ] Domain resolves to VPS
- [ ] SSL certificate valid
- [ ] API responds to `/api/config`
- [ ] Can login via POST `/api/login`
- [ ] Can access protected routes with token
- [ ] Frontend loads and makes API calls
- [ ] Database is accessible
- [ ] Logs are being written
- [ ] Caches are working
- [ ] Backups are running
- [ ] Firewall is active
- [ ] App debug is off
- [ ] Storage permissions correct

---

## 🎉 Deployment Complete!

If all items are checked, your O.B.Mighty system is ready for production!

### Troubleshooting
If you hit issues, check:
1. Error logs: `/var/www/neziz/contribution-backend/storage/logs/laravel.log`
2. Nginx logs: `/var/log/nginx/error.log`
3. Database: `mysql contribution_db`
4. Permissions: `ls -la /var/www/neziz/`
