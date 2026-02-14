# API Deployment & Testing Guide - O.B.Mighty

## Overview

Your API is correctly configured. The 405 error occurs because login endpoint only accepts **POST** requests, not GET.

## Quick Fix

### Testing Login Endpoint

**❌ WRONG:** Visiting in browser
```
https://api.neziz.cloud/api/login
```
This sends a GET request → 405 Error

**✅ CORRECT:** Send POST request with credentials

---

## API Testing Methods

### 1. Using cURL (Terminal)

```bash
# Login
curl -X POST https://api.neziz.cloud/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ceo@company.com",
    "password": "password123"
  }'

# Get current user (requires token)
curl -X GET https://api.neziz.cloud/api/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get payments
curl -X GET https://api.neziz.cloud/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Using Postman (GUI)

#### Step 1: Create Login Request
- **Method:** POST
- **URL:** `https://api.neziz.cloud/api/login`
- **Headers Tab:**
  ```
  Content-Type: application/json
  ```
- **Body Tab (raw, JSON):**
  ```json
  {
    "email": "ceo@company.com",
    "password": "password123"
  }
  ```
- Click **Send**

#### Step 2: Store Token
Response will include:
```json
{
  "token": "abc123def456...",
  "user": { ... }
}
```

Copy the token and use in subsequent requests:

- **Headers Tab:**
  ```
  Authorization: Bearer abc123def456...
  ```

### 3. Using Thunder Client (VS Code Extension)

1. Install Thunder Client extension
2. Create new request
3. Set to POST: `https://api.neziz.cloud/api/login`
4. Add body as JSON
5. Send

### 4. Using Frontend (React/Axios)

Your frontend should make POST request:

```javascript
// src/services/authService.js
import axios from 'axios';

const API_URL = 'https://api.neziz.cloud/api';

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password
    });
    
    // Store token
    localStorage.setItem('auth_token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
```

---

## API Endpoints Reference

### Public Endpoints (No Authentication Required)

```
POST   /api/login
       Body: { email, password }
       Returns: { token, user }

GET    /api/config
       Returns: Application configuration
```

### Protected Endpoints (Require Authentication)

All protected endpoints require:
```
Headers: {
  Authorization: Bearer <your_token>
  Content-Type: application/json
}
```

#### Authentication
```
GET    /api/me
       Returns: Current authenticated user

POST   /api/logout
       Logs out user

POST   /api/profile
       Updates user profile
```

#### Payments
```
GET    /api/payments
       Returns: List of payments (paginated)

POST   /api/payments
       Body: { customer_id, payment_amount, payment_method, payment_date }
       Returns: Created payment

GET    /api/payments/{id}
       Returns: Payment details

PUT    /api/payments/{id}
       Updates payment

DELETE /api/payments/{id}
       Deletes payment
```

#### Customers
```
GET    /api/customers
       Returns: List of customers

POST   /api/customers
       Creates new customer

GET    /api/customers/{id}
       Returns: Customer details

PUT    /api/customers/{id}
       Updates customer

DELETE /api/customers/{id}
       Deletes customer
```

#### Branches
```
GET    /api/branches
GET    /api/branches/{id}
POST   /api/branches
PUT    /api/branches/{id}
DELETE /api/branches/{id}
```

#### Reports
```
GET    /api/reports/profitability
       Query params: ?start_date=2026-01-01&end_date=2026-12-31

GET    /api/reports/customer-performance
GET    /api/reports/worker-productivity
GET    /api/reports/inventory-status
GET    /api/reports/ledger
GET    /api/reports/audit-trail
```

#### Admin (Super Admin Only)
```
GET    /api/admin/companies
GET    /api/admin/stats
GET    /api/admin/metrics
POST   /api/admin/users/{id}/roles
```

---

## Deployment Checklist

### 1. Environment Setup

```bash
# SSH into your server
ssh user@neziz.cloud

# Navigate to project
cd /var/www/neziz/contribution-backend

# Verify .env file
cat .env
```

**Required .env variables:**
```
APP_URL=https://api.neziz.cloud
APP_ENV=production
APP_DEBUG=false
FRONTEND_URL=https://neziz.cloud

DB_HOST=localhost
DB_DATABASE=contribution_db
DB_USERNAME=root
DB_PASSWORD=yourpassword

CACHE_DRIVER=redis
SESSION_DRIVER=cookie
QUEUE_CONNECTION=sync

MAIL_FROM_ADDRESS=noreply@neziz.cloud
```

### 2. Server Configuration

#### Check Nginx Configuration

Your Nginx should point `/api/*` to the backend:

```nginx
server {
    server_name api.neziz.cloud;
    root /var/www/neziz/contribution-backend/public;
    
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
}
```

#### Check PHP Configuration

```bash
# Verify PHP-FPM is running
sudo systemctl status php8.2-fpm

# Restart if needed
sudo systemctl restart php8.2-fpm

# Check PHP version
php --version
```

#### Check Database

```bash
# Connect to database
mysql -u root -p contribution_db

# Verify tables exist
SHOW TABLES;

# Check migrations
SELECT * FROM migrations;
```

### 3. Permissions

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/neziz/contribution-backend
sudo chmod -R 755 /var/www/neziz/contribution-backend
sudo chmod -R 755 /var/www/neziz/contribution-backend/storage
sudo chmod -R 755 /var/www/neziz/contribution-backend/bootstrap/cache
```

### 4. Laravel Optimization

```bash
# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan view:clear

# Run migrations
php artisan migrate

# Seed database (if needed)
php artisan db:seed

# Cache configuration
php artisan config:cache
php artisan route:cache
```

### 5. SSL Certificate

Verify HTTPS is working:

```bash
# Check certificate
sudo certbot certificates

# Renew if needed
sudo certbot renew
```

### 6. Frontend Configuration

Update frontend to point to correct API:

```javascript
// src/services/api.js or similar
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.neziz.cloud/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Testing Checklist

### 1. API Health Check

```bash
# Check if API is responding
curl https://api.neziz.cloud/api/config

# Should return 200 OK with config data
```

### 2. Login Test

```bash
# Test login with valid credentials
curl -X POST https://api.neziz.cloud/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "password"
  }'

# Should return token
```

### 3. Authentication Test

```bash
# Get current user (requires token from login)
curl -X GET https://api.neziz.cloud/api/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return user info
```

### 4. CORS Test

Test from your frontend domain:

```javascript
// From console at https://neziz.cloud
fetch('https://api.neziz.cloud/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@company.com',
    password: 'password'
  })
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error(err))
```

### 5. Database Test

```bash
# SSH into server
ssh user@neziz.cloud

# Test database connection
php artisan tinker

# In tinker
>>> DB::connection()->getPdo();
>>> App\Models\User::count();
```

---

## Troubleshooting

### Issue: 405 Method Not Allowed

**Cause:** Using GET instead of POST
**Solution:** Use POST request for `/api/login`

### Issue: 401 Unauthorized

**Cause:** Invalid or missing token
**Solution:** 
1. Login first to get token
2. Include token in Authorization header
3. Format: `Authorization: Bearer <token>`

### Issue: 500 Internal Server Error

**Cause:** Server error
**Solution:**
1. Check error logs: `tail -f /var/www/neziz/contribution-backend/storage/logs/laravel.log`
2. Verify .env configuration
3. Check database connection
4. Run migrations: `php artisan migrate`

### Issue: CORS Error

**Cause:** Request blocked by CORS policy
**Solution:**
1. Verify CORS config allows your domain
2. Check `config/cors.php`
3. Ensure frontend makes request correctly

### Issue: Cannot Connect to Database

**Cause:** Database credentials wrong
**Solution:**
1. Verify .env DB_* variables
2. Test connection: `mysql -u root -p -h localhost contribution_db`
3. Ensure MySQL service running: `sudo systemctl status mysql`

---

## Production Best Practices

1. ✅ Set `APP_DEBUG=false` in production
2. ✅ Use strong database password
3. ✅ Enable HTTPS/SSL
4. ✅ Set up backup strategy
5. ✅ Monitor error logs
6. ✅ Use rate limiting (already configured)
7. ✅ Enable caching
8. ✅ Set up log rotation
9. ✅ Monitor disk space
10. ✅ Regular security updates

---

## Support

If you still encounter issues:

1. Check Laravel logs: `storage/logs/laravel.log`
2. Check Nginx logs: `/var/log/nginx/error.log`
3. Test with cURL first
4. Verify .env configuration
5. Ensure database is accessible

The API is working correctly - the 405 error is expected behavior for GET requests to POST-only endpoints.
