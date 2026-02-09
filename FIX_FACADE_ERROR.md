# Fix for "Facade Root Has Not Been Set" Error

## The Problem
The facade error usually means Laravel's dependencies weren't installed correctly by Composer.

## Solution: Fresh Composer Install

### Step 1: Delete vendor directory
```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend
Remove-Item -Recurse -Force vendor
Remove-Item -Force composer.lock
```

### Step 2: Fresh Composer Install
```bash
composer install --no-scripts
```

This installs packages WITHOUT running post-install scripts that might fail.

### Step 3: Generate Autoload Files
```bash
composer dump-autoload
```

### Step 4: Now Try Artisan Commands
```bash
php artisan --version
```

If this works, you'll see:
```
Laravel Framework 10.x.x
```

### Step 5: Run Migrations
```bash
php artisan migrate
php artisan db:seed --class=RolePermissionSeeder
```

---

## Alternative: If Above Doesn't Work

The issue might be that we're building Laravel from scratch. Instead, let's use a proper Laravel installation:

### Option A: Use Laravel Installer
```bash
# Install Laravel installer globally
composer global require laravel/installer

# Create new Laravel project
laravel new temp-backend

# Copy our files into it
# Then copy temp-backend vendor folder to our contribution-backend
```

### Option B: Use Composer Create-Project
```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty

# Create fresh Laravel installation
composer create-project laravel/laravel temp-laravel "10.*"

# Copy vendor folder from temp-laravel to contribution-backend
Copy-Item -Recurse temp-laravel\vendor contribution-backend\vendor -Force

# Try artisan again
cd contribution-backend
php artisan migrate
```

---

## Quick Test

Try this command to see if Laravel can bootstrap:
```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend
php artisan --version
```

If you see "Laravel Framework 10.x.x", Laravel is working!
If you still see the facade error, we need to do a fresh composer install.

Let me know what happens!
