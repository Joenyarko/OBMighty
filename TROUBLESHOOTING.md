# QUICK TROUBLESHOOTING - 405 Error & API Issues

## Your Setup
- **Backend API:** https://api.neziz.cloud
- **Frontend:** https://neziz.cloud  
- **Error:** `HTTP 405 Method Not Allowed` for `/api/login`

---

## The Problem (Explained)

You're getting a 405 error because you're trying to **GET** the login endpoint in your browser.

**Browser = GET request:**
```
https://api.neziz.cloud/api/login  ❌ This sends GET request
```

**API expects POST request:**
```
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Solution: Quick Test

### Step 1: Test API is Working

Open terminal/PowerShell and run:

```bash
# Test if API responds
curl -X GET https://api.neziz.cloud/api/config

# If working, you should see JSON response
```

### Step 2: Test Login Endpoint

```bash
# Replace email and password with valid credentials
curl -X POST https://api.neziz.cloud/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123"
  }'

# If successful, response will be:
# {
#   "token": "abc123...",
#   "user": {...}
# }
```

### Step 3: Test with Token

```bash
# Use token from Step 2
curl -X GET https://api.neziz.cloud/api/me \
  -H "Authorization: Bearer abc123..."

# Should return your user info
```

---

## Common Issues & Fixes

### Issue 1: Connection Refused

**Error:** Connection refused or timeout

**Fixes:**
```bash
# Check backend is running
sudo systemctl status php8.2-fpm
sudo systemctl status nginx

# Restart if needed
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
```

### Issue 2: Database Error

**Error:** SQLSTATE[HY000]: General error

**Fixes:**
```bash
# SSH to server
ssh user@api.neziz.cloud

# Check database
cd /var/www/neziz/contribution-backend
php artisan migrate
php artisan db:seed
```

### Issue 3: 500 Internal Error

**Error:** 500 Internal Server Error

**Fixes:**
```bash
# Check logs
ssh user@api.neziz.cloud
tail -f /var/www/neziz/contribution-backend/storage/logs/laravel.log

# Clear cache
cd /var/www/neziz/contribution-backend
php artisan cache:clear
php artisan config:clear
```

### Issue 4: CORS Error (From Frontend)

**Error:** CORS policy: No 'Access-Control-Allow-Origin' header

**Fixes:**
1. Check `config/cors.php` has:
   ```php
   'allowed_origins' => ['*'],
   'supported_credentials' => true,
   ```

2. Restart PHP:
   ```bash
   sudo systemctl restart php8.2-fpm
   ```

### Issue 5: Wrong Token/Unauthorized

**Error:** 401 Unauthorized

**Fixes:**
1. Make sure you're using the token from login response
2. Check token format: `Authorization: Bearer YOUR_TOKEN`
3. Get new token by logging in again

---

## Verification Checklist

Run on your server:

```bash
ssh user@api.neziz.cloud

# 1. Check PHP
php --version

# 2. Check Nginx
sudo systemctl status nginx

# 3. Check MySQL  
sudo systemctl status mysql

# 4. Check permissions
ls -la /var/www/neziz/contribution-backend/storage

# 5. Check Laravel
cd /var/www/neziz/contribution-backend
php artisan route:list | grep login

# 6. Test database
php artisan tinker
> DB::connection()->getPdo();
> User::count();

# 7. Check logs
tail -f storage/logs/laravel.log
```

---

## Frontend Integration

Make sure your React/frontend is calling the API correctly:

```javascript
// ❌ WRONG
fetch('https://api.neziz.cloud/api/login')  // This will send GET

// ✅ CORRECT
fetch('https://api.neziz.cloud/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@company.com',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Token:', data.token);
  localStorage.setItem('auth_token', data.token);
})
.catch(err => console.error('Login failed:', err));
```

---

## What to Check First

1. **Can you reach the API?**
   ```bash
   curl https://api.neziz.cloud/api/config
   ```
   Should return status 200

2. **Can you login?**
   ```bash
   curl -X POST https://api.neziz.cloud/api/login -H "Content-Type: application/json" -d '{"email":"admin@company.com","password":"password123"}'
   ```
   Should return a token

3. **Can you access protected routes?**
   ```bash
   curl -X GET https://api.neziz.cloud/api/me -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Should return user data

4. **Are frontend and backend on same domain?**
   - Frontend: `https://neziz.cloud`
   - API: `https://api.neziz.cloud`
   
   ✅ This is correct (subdomain)

---

## Next Steps

1. **Test the API** using cURL commands above
2. **Fix any issues** from the checklist
3. **Update frontend** to make POST requests to `/api/login`
4. **Test login flow** from frontend
5. **Check browser console** for errors
6. **Enable logging** in `.env` for debugging

---

## Get Help

If still having issues:

1. **Check error logs:**
   ```bash
   ssh user@api.neziz.cloud
   tail -100 /var/www/neziz/contribution-backend/storage/logs/laravel.log
   ```

2. **Run verification script:**
   ```bash
   bash /var/www/neziz/verify-deployment.sh
   ```

3. **Test database directly:**
   ```bash
   mysql -u root -p contribution_db
   SHOW TABLES;
   SELECT COUNT(*) FROM users;
   ```

Remember: **The 405 error is not a bug** - it's correct behavior. Login must use POST request, not GET.
