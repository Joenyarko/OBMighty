@echo off
echo ========================================
echo O.B. Mighty - Database Migration Script
echo ========================================
echo.

cd /d "%~dp0contribution-backend"

echo Step 1: Installing Composer dependencies...
call composer install
if %errorlevel% neq 0 (
    echo ERROR: Composer install failed!
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo Step 2: Generating application key...
call php artisan key:generate
if %errorlevel% neq 0 (
    echo ERROR: Key generation failed!
    pause
    exit /b 1
)
echo ✓ Application key generated
echo.

echo Step 3: Running database migrations...
echo This will create all tables in the obmighty database
call php artisan migrate
if %errorlevel% neq 0 (
    echo ERROR: Migration failed!
    echo.
    echo Common issues:
    echo - Database 'obmighty' not created in phpMyAdmin
    echo - Wrong MySQL password in .env file
    echo - MySQL not running in XAMPP
    pause
    exit /b 1
)
echo ✓ All tables created successfully!
echo.

echo Step 4: Seeding roles and permissions...
call php artisan db:seed --class=RolePermissionSeeder
if %errorlevel% neq 0 (
    echo ERROR: Seeding failed!
    pause
    exit /b 1
)
echo ✓ Roles and permissions created
echo.

echo ========================================
echo ✓ Database setup complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create CEO user: php artisan tinker
echo 2. Start backend: php artisan serve
echo 3. Start frontend: cd ..\contribution-frontend ^&^& npm run dev
echo.
pause
