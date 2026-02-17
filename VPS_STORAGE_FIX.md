# VPS Storage & Image Fix Guide

## 🔍 The Problem

Your VPS is showing **404 errors for image files**:
```
GET https://obmighty.neziz.cloud/storage/companies/S1E0KuWanEocWDhhku70E66wV8NmTEm5hKNTgmGE.png 404
GET https://obmighty.neziz.cloud/storage/companies/6ACGmQ1lEgvd3PvvmcrfIsIwwD7YHRsbSadYO0u2.jpg 404
```

The images **exist** in the database but the web server can't find them because the **storage symlink is broken or missing**.

---

## ✅ The Fix (3 Steps)

### Step 1: SSH into Your VPS
```bash
ssh root@your_vps_ip
```

### Step 2: Check Current Storage Status
```bash
# Check if symlink exists and is working
ls -la /var/www/obmighty/contribution-backend/public/

# You should see:
# storage -> ../storage/app/public
```

### Step 3: Fix the Symlink

#### Option A: Use the provided script (Easiest)
```bash
cd /var/www/obmighty

# Download and run the fix script
chmod +x vps-fix-storage.sh
./vps-fix-storage.sh
```

#### Option B: Manual fix
```bash
cd /var/www/obmighty/contribution-backend

# Remove broken symlink if it exists
rm -f public/storage

# Create new symlink
php artisan storage:link

# Verify it worked
ls -la public/storage
```

---

## 🧪 Verify the Fix

### 1. Check Symlink Exists
```bash
ls -la /var/www/obmighty/contribution-backend/public/
```

Expected output:
```
lrwxrwxrwx  1 www-data www-data   30 Feb 15 10:00 storage -> ../storage/app/public
```

### 2. Check Image Files Exist
```bash
# Check companies logos
ls -la /var/www/obmighty/contribution-backend/storage/app/public/companies/

# Check image logos  
ls -la /var/www/obmighty/contribution-backend/storage/app/public/images/logos/

# Check cards
ls -la /var/www/obmighty/contribution-backend/storage/app/public/images/cards/
```

### 3. Test Direct File Access
```bash
# Check if files are accessible through the symlink
ls -la /var/www/obmighty/contribution-backend/public/storage/companies/
ls -la /var/www/obmighty/contribution-backend/public/storage/images/logos/
```

---

## 🌐 Test in Browser

After fixing, test these URLs in your browser:

```
# Test company logos
https://obmighty.neziz.cloud/storage/companies/{filename}

# Test image logos
https://obmighty.neziz.cloud/storage/images/logos/{filename}

# Test if one of your actual images loads
# Replace with real filename from error messages:
https://obmighty.neziz.cloud/storage/companies/S1E0KuWanEocWDhhku70E66wV8NmTEm5hKNTgmGE.png
https://obmighty.neziz.cloud/storage/companies/6ACGmQ1lEgvd3PvvmcrfIsIwwD7YHRsbSadYO0u2.jpg
```

---

## 🔧 Why This Happens

1. **On Local Dev**: Windows doesn't support Unix symlinks, so it's created as a junction/dir
2. **On VPS**: After deployment, the symlink might:
   - Not be created (if you didn't run `php artisan storage:link`)
   - Be broken (pointing to wrong path)
   - Have wrong permissions
   - Be created but not reachable by web server

---

## 📁 File Structure (What Should Exist)

```
/var/www/obmighty/contribution-backend/
├── storage/app/public/        ← Actual files stored here
│   ├── companies/            ← Company logos
│   │   ├── S1E0KuWanE...png
│   │   └── 6ACGmQ1lEg...jpg
│   └── images/
│       ├── logos/            ← Application logos
│       │   └── ...
│       └── cards/            ← Card images
│           └── ...
│
└── public/                    ← Web root
    └── storage → ../storage/app/public   ← Symlink (this is KEY!)
```

---

## 🛠️ Complete Troubleshooting Checklist

- [ ] Symlink exists: `ls -la public/storage`
- [ ] Symlink points correctly: should show `-> ../storage/app/public`
- [ ] Files exist: `ls storage/app/public/companies/`
- [ ] Nginx can access: `curl http://localhost/storage/companies/filename.jpg`
- [ ] Permissions correct: `ls -la storage/` shows `www-data:www-data`
- [ ] Test URL works: `https://domain.com/storage/companies/filename.jpg` loads image

---

## 🚨 If Files are Missing Entirely

If the image files don't exist even in `storage/app/public/`:

### 1. Check if they're in the wrong location
```bash
# Search for image files across storage
find /var/www/obmighty/contribution-backend/storage -type f -name "*.jpg" | head -20
find /var/www/obmighty/contribution-backend/storage -type f -name "*.png" | head -20
```

### 2. Check database for file references
```bash
# Connect to MySQL
mysql -u obmighty_user -p

# View companies with their logo paths
SELECT id, name, logo_url FROM companies LIMIT 5;

# View cards with images
SELECT id, card_name, front_image, back_image FROM cards LIMIT 5;
```

### 3. If files are in wrong location, move them
```bash
# Example: if files are in /public instead of /storage/app/public
cp -r /var/www/obmighty/contribution-backend/public/companies/* \
    /var/www/obmighty/contribution-backend/storage/app/public/companies/

# Fix permissions
sudo chown -R www-data:www-data /var/www/obmighty/contribution-backend/storage
chmod -R 755 /var/www/obmighty/contribution-backend/storage
```

---

## 🔐 Fix Permissions (If Needed)

```bash
cd /var/www/obmighty/contribution-backend

# Ensure www-data owns storage directory
sudo chown -R www-data:www-data storage

# Set correct permissions
chmod -R 755 storage
chmod -R 775 storage/app/public

# Verify
ls -la storage/app/public/companies/
```

---

## 📝 Quick Commands Reference

```bash
# SSH to VPS
ssh root@your_vps_ip

# Fix storage symlink
cd /var/www/obmighty/contribution-backend
php artisan storage:link

# Verify images exist
ls -la storage/app/public/companies/
ls -la public/storage/companies/

# Check permissions
ls -la storage/

# Restart web server (in case of caching)
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm

# Check latest images that were uploaded
ls -lrt storage/app/public/companies/ | tail -10
```

---

## ✅ After Fix: Test Everything

### 1. Company Login & Logo
- Login to application
- Go to company settings
- Verify company logo displays

### 2. Dashboard
- Go to CEO dashboard
- Verify cards display with data
- Check for any broken image icons

### 3. Card Management
- Check card templates load images
- Verify front/back card images display

### 4. Browser Console
- Should see NO 404 errors for `/storage/`
- Should see NO manifest icon errors

---

## 💡 Pro Tips

**To avoid this in future deployments:**

1. Add to your deployment script:
```bash
cd /var/www/obmighty/contribution-backend
php artisan storage:link
```

2. Add to your `.gitignore`:
```
/public/storage
/storage/logs
/storage/cache
```

3. After git pull on VPS, always run:
```bash
php artisan storage:link
php artisan optimize:clear
```

---

## 🆘 Still Not Working?

Run this debug command on VPS:

```bash
cd /var/www/obmighty/contribution-backend

# Show symlink
echo "=== Symlink Status ==="
ls -la public/storage

# Show files
echo "=== Files in storage ==="
ls -la storage/app/public/companies/ | head -5

# Test symlink target
echo "=== Test Symlink ==="
readlink -f public/storage

# Check Nginx can access
echo "=== Test via Nginx ==="
curl -I http://localhost/storage/companies/ 2>&1 | head -5

# Show permissions
echo "=== Storage Permissions ==="
ls -la storage/
```

Then share the output if you need help!
