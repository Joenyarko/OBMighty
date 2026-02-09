# Multi-Branch Daily Contribution PWA - Deployment Guide

## 📋 Prerequisites

### Backend Requirements
- PHP 8.1 or higher
- Composer
- MySQL 8.0 or higher
- Apache/Nginx web server

### Frontend Requirements
- Node.js 18+ and npm

---

## 🚀 Backend Deployment (Laravel)

### Step 1: Install Dependencies

```bash
cd contribution-backend
composer install --optimize-autoloader --no-dev
```

### Step 2: Environment Configuration

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

Edit `.env` file with your database credentials:

```env
APP_NAME="Contribution Manager"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=contribution_db
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

SANCTUM_STATEFUL_DOMAINS=yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Step 3: Database Setup

```bash
# Run migrations
php artisan migrate

# Install Spatie Permission tables
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan migrate

# Seed roles and permissions
php artisan db:seed --class=RolePermissionSeeder
```

### Step 4: Create First CEO User

```bash
php artisan tinker
```

Then run:

```php
$user = \App\Models\User::create([
    'name' => 'CEO Name',
    'email' => 'ceo@example.com',
    'password' => bcrypt('your-secure-password'),
    'status' => 'active',
]);

$user->assignRole('ceo');
```

### Step 5: Configure Web Server

#### Apache (.htaccess)

Create `.htaccess` in `public/` directory:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [L]
</IfModule>
```

#### Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/contribution-backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Step 6: Set Permissions

```bash
# Storage and cache permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### Step 7: Optimize for Production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 🎨 Frontend Deployment (React PWA)

### Step 1: Install Dependencies

```bash
cd contribution-frontend
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```env
VITE_API_URL=https://yourdomain.com/api
```

### Step 3: Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized production files.

### Step 4: Deploy Static Files

#### Option A: Same Server as Backend

Copy `dist/` contents to your web server's public directory:

```bash
cp -r dist/* /var/www/html/
```

#### Option B: Separate Static Hosting (Netlify, Vercel)

1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variable: `VITE_API_URL=https://api.yourdomain.com/api`

### Step 5: Configure Routing

For single-page application routing, add to your web server config:

#### Apache

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### Nginx

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 🔒 Security Checklist

- [ ] Set `APP_DEBUG=false` in production
- [ ] Use strong database passwords
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure CORS properly in `config/cors.php`
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Regular database backups
- [ ] Keep dependencies updated

---

## 📱 PWA Installation

Once deployed, users can install the app:

1. **Android Chrome**: Tap menu → "Add to Home Screen"
2. **iOS Safari**: Tap share → "Add to Home Screen"
3. **Desktop Chrome**: Click install icon in address bar

---

## 🔧 Troubleshooting

### Issue: 500 Internal Server Error

**Solution:**
- Check Laravel logs: `storage/logs/laravel.log`
- Verify file permissions
- Clear cache: `php artisan cache:clear`

### Issue: CORS Errors

**Solution:**
Edit `config/cors.php`:

```php
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
'supports_credentials' => true,
```

### Issue: Database Connection Failed

**Solution:**
- Verify database credentials in `.env`
- Check MySQL is running
- Ensure database exists

### Issue: API Returns 401 Unauthorized

**Solution:**
- Check Sanctum configuration
- Verify token is being sent in headers
- Clear browser localStorage and re-login

---

## 📊 Monitoring & Maintenance

### Database Backups

```bash
# Daily backup script
mysqldump -u username -p contribution_db > backup_$(date +%Y%m%d).sql
```

### Log Monitoring

```bash
# Watch Laravel logs
tail -f storage/logs/laravel.log
```

### Performance Optimization

```bash
# Clear all caches
php artisan optimize:clear

# Rebuild caches
php artisan optimize
```

---

## 🆘 Support

For issues or questions:
1. Check Laravel logs
2. Review browser console for frontend errors
3. Verify API endpoints are accessible
4. Check database connectivity

---

## 📝 Post-Deployment Tasks

1. Create initial branches
2. Create secretaries and assign to branches
3. Create workers and assign to branches
4. Create contribution cards
5. Test payment recording flow
6. Verify reports are generating correctly

---

## 🔄 Updates & Maintenance

### Updating Backend

```bash
git pull origin main
composer install --no-dev
php artisan migrate
php artisan optimize
```

### Updating Frontend

```bash
git pull origin main
npm install
npm run build
# Deploy new dist/ files
```

---

**Congratulations! Your Multi-Branch Daily Contribution PWA is now deployed! 🎉**
