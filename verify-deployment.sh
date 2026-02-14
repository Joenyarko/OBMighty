#!/bin/bash

# O.B.Mighty Deployment Verification Script
# Run this on your VPS to verify everything is correctly configured

echo "======================================"
echo "O.B.Mighty Deployment Verification"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: PHP Version
echo -e "\n${YELLOW}[1/10] Checking PHP Installation...${NC}"
if command -v php &> /dev/null; then
    php_version=$(php --version | head -n1)
    echo -e "${GREEN}✓ PHP Installed:${NC} $php_version"
else
    echo -e "${RED}✗ PHP not found${NC}"
fi

# Check 2: PHP-FPM Status
echo -e "\n${YELLOW}[2/10] Checking PHP-FPM Service...${NC}"
if sudo systemctl status php8.2-fpm &> /dev/null; then
    echo -e "${GREEN}✓ PHP-FPM is running${NC}"
else
    echo -e "${RED}✗ PHP-FPM is not running${NC}"
fi

# Check 3: Nginx Status
echo -e "\n${YELLOW}[3/10] Checking Nginx Service...${NC}"
if sudo systemctl status nginx &> /dev/null; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx is not running${NC}"
fi

# Check 4: MySQL Status
echo -e "\n${YELLOW}[4/10] Checking MySQL Service...${NC}"
if sudo systemctl status mysql &> /dev/null; then
    echo -e "${GREEN}✓ MySQL is running${NC}"
else
    echo -e "${RED}✗ MySQL is not running${NC}"
fi

# Check 5: Laravel Installation
echo -e "\n${YELLOW}[5/10] Checking Laravel Installation...${NC}"
if [ -f "/var/www/neziz/contribution-backend/artisan" ]; then
    echo -e "${GREEN}✓ Laravel artisan found${NC}"
else
    echo -e "${RED}✗ Laravel artisan not found${NC}"
fi

# Check 6: Storage Permissions
echo -e "\n${YELLOW}[6/10] Checking Storage Permissions...${NC}"
storage_perm=$(ls -ld /var/www/neziz/contribution-backend/storage | awk '{print $1}')
if [ -w "/var/www/neziz/contribution-backend/storage" ]; then
    echo -e "${GREEN}✓ Storage directory is writable${NC}"
else
    echo -e "${RED}✗ Storage directory is NOT writable${NC}"
    echo "   Run: sudo chown -R www-data:www-data /var/www/neziz/contribution-backend/storage"
fi

# Check 7: Database Connection
echo -e "\n${YELLOW}[7/10] Checking Database Connection...${NC}"
cd /var/www/neziz/contribution-backend
if php artisan tinker --execute="DB::connection()->getPdo();" 2>/dev/null | grep -q "PDO"; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "   Check .env DB_* variables"
fi

# Check 8: .env Configuration
echo -e "\n${YELLOW}[8/10] Checking .env Configuration...${NC}"
if [ -f "/var/www/neziz/contribution-backend/.env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check required variables
    required_vars=("APP_URL" "DB_HOST" "DB_DATABASE" "APP_KEY")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" /var/www/neziz/contribution-backend/.env; then
            echo -e "${GREEN}  ✓ $var is configured${NC}"
        else
            echo -e "${RED}  ✗ $var is missing${NC}"
        fi
    done
else
    echo -e "${RED}✗ .env file not found${NC}"
fi

# Check 9: Routes Registered
echo -e "\n${YELLOW}[9/10] Checking API Routes...${NC}"
cd /var/www/neziz/contribution-backend
route_count=$(php artisan route:list | grep -c "api/")
echo -e "${GREEN}✓ Found $route_count API routes${NC}"

# Check 10: SSL Certificate
echo -e "\n${YELLOW}[10/10] Checking SSL Certificate...${NC}"
if sudo certbot certificates 2>/dev/null | grep -q "api.neziz.cloud"; then
    echo -e "${GREEN}✓ SSL certificate found for api.neziz.cloud${NC}"
    cert_exp=$(sudo certbot certificates 2>/dev/null | grep "Expiry Date" | head -1)
    echo "  $cert_exp"
else
    echo -e "${YELLOW}⚠ SSL certificate may need verification${NC}"
fi

# Summary
echo -e "\n======================================"
echo -e "${GREEN}Verification Complete!${NC}"
echo "======================================"
echo -e "\nNext steps:"
echo "1. Test login: curl -X POST https://api.neziz.cloud/api/login"
echo "2. Check logs: tail -f /var/www/neziz/contribution-backend/storage/logs/laravel.log"
echo "3. Verify database: php artisan tinker"
