#!/bin/bash

# VPS Storage Link Fix - O.B.Mighty
# Run this script on your VPS to fix the storage symlink issue

set -e

BACKEND_PATH="/var/www/obmighty/contribution-backend"

echo "🔧 Fixing Storage Symlink on VPS..."
echo ""

# Check current state
echo "📋 Current state:"
ls -la $BACKEND_PATH/public/ | grep storage

echo ""
echo "🔄 Fixing symlink..."

# Remove broken symlink if it exists
if [ -L "$BACKEND_PATH/public/storage" ]; then
    echo "  Removing existing symlink..."
    rm -f $BACKEND_PATH/public/storage
fi

# Create correct symlink
cd $BACKEND_PATH
php artisan storage:link

echo ""
echo "✅ Symlink created!"
echo ""

# Verify
echo "📋 Verification:"
ls -la $BACKEND_PATH/public/ | grep storage

echo ""
echo "✅ Storage symlink fixed!"
echo ""
echo "Now test the image URLs:"
echo "  https://yourdomain.com/storage/companies/{filename}"
echo "  https://yourdomain.com/storage/images/logos/{filename}"
