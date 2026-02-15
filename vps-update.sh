#!/bin/bash

# VPS Update Script - O.B.Mighty
# Run this script on your VPS to pull latest changes

set -e  # Exit on error

echo "🔄 Starting O.B.Mighty VPS Update..."
echo ""

# Paths
BACKEND_PATH="/var/www/obmighty/contribution-backend"
FRONTEND_PATH="/var/www/obmighty/contribution-frontend"

# =============================================================================
# 1. UPDATE BACKEND
# =============================================================================
echo "📦 Updating Backend..."
cd $BACKEND_PATH

# Pull latest code
echo "  Pulling latest code from git..."
git pull origin master

# Install composer dependencies
echo "  Installing dependencies..."
composer install --optimize-autoloader --no-dev

# Run migrations
echo "  Running database migrations..."
php artisan migrate --force

# Clear all caches
echo "  Clearing caches..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache

# Fix permissions
echo "  Fixing permissions..."
sudo chown -R www-data:www-data storage
sudo chown -R www-data:www-data bootstrap/cache
chmod -R 775 storage bootstrap/cache

echo "✅ Backend update complete!"
echo ""

# =============================================================================
# 2. UPDATE FRONTEND (if needed)
# =============================================================================
if [ -d "$FRONTEND_PATH" ]; then
    echo "🎨 Updating Frontend..."
    cd $FRONTEND_PATH

    # Pull latest code
    echo "  Pulling latest code from git..."
    git pull origin master

    # Build frontend
    echo "  Building frontend..."
    npm install
    NODE_ENV=production npm run build

    echo "✅ Frontend update complete!"
    echo ""
fi

# =============================================================================
# 3. RESTART SERVICES
# =============================================================================
echo "🔄 Restarting services..."
sudo systemctl reload nginx
sudo systemctl reload php8.1-fpm

echo ""
echo "✅ Update Complete!"
echo ""
echo "Summary:"
echo "  ✓ Backend code updated"
echo "  ✓ Dependencies installed"
echo "  ✓ Database migrations run"
echo "  ✓ Caches cleared and optimized"
echo "  ✓ Frontend rebuilt (if applicable)"
echo "  ✓ Services restarted"
echo ""
echo "Check your application at: https://yourdomain.com"
