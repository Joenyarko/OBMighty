# O.B. Mighty - Complete Installation Guide for XAMPP

## ⚠️ Important: Install These First!

Before setting up the database, you need to install:

1. **Composer** (PHP dependency manager)
2. Make sure **XAMPP** is running

---

## Step 1: Install Composer

### Download and Install Composer

1. **Download Composer:**
   - Go to: https://getcomposer.org/download/
   - Click **"Composer-Setup.exe"** (Windows Installer)

2. **Run the Installer:**
   - Run the downloaded `Composer-Setup.exe`
   - When asked for PHP location, browse to: `C:\xampp\php\php.exe`
   - Click "Next" through the installation
   - Click "Install"
   - Click "Finish"

3. **Verify Installation:**
   Open Command Prompt and run:
   ```bash
   composer --version
   ```
   
   You should see something like:
   ```
   Composer version 2.x.x
   ```

✅ Composer installed!

---

## Step 2: Start XAMPP

1. Open **XAMPP Control Panel**
2. Click **"Start"** for:
   - ✅ Apache
   - ✅ MySQL (should be on port 3307)

---

## Step 3: Create Database in phpMyAdmin

1. **Open phpMyAdmin:**
   - Go to: http://localhost/phpmyadmin
   - Or click "Admin" next to MySQL in XAMPP

2. **Create Database:**
   - Click **"New"** in the left sidebar
   - Database name: `obmighty`
   - Collation: `utf8mb4_unicode_ci`
   - Click **"Create"**

✅ Database created!

---

## Step 4: Configure Backend

1. **Add MySQL Password to .env:**
   
   Open this file:
   ```
   c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend\.env
   ```
   
   Find this line:
   ```env
   DB_PASSWORD=
   ```
   
   If you have no MySQL password (default XAMPP), leave it empty.
   If you set a password, add it:
   ```env
   DB_PASSWORD=your_password
   ```

---

## Step 5: Install Laravel Dependencies

Open **Command Prompt** and run:

```bash
# Navigate to backend folder
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend

# Install all Laravel packages (this will take 2-3 minutes)
composer install
```

**What this does:**
- Downloads Laravel framework
- Installs Sanctum (authentication)
- Installs Spatie (roles & permissions)
- Sets up all dependencies

**Expected output:**
```
Loading composer repositories with package information
Installing dependencies from lock file
...
Package operations: 100+ installs, 0 updates, 0 removals
...
Generating optimized autoload files
```

✅ Dependencies installed!

---

## Step 6: Generate Application Key

```bash
php artisan key:generate
```

**Expected output:**
```
Application key set successfully.
```

---

## Step 7: Run Migrations (Create All Tables)

```bash
php artisan migrate
```

**What this does:**
- Creates all 13 core tables automatically
- Sets up foreign keys and indexes
- Creates permission tables

**Expected output:**
```
Migration table created successfully.
Migrating: 2024_01_01_000001_create_branches_table
Migrated:  2024_01_01_000001_create_branches_table (45.67ms)
Migrating: 2024_01_01_000002_create_users_table
Migrated:  2024_01_01_000002_create_users_table (52.34ms)
...
(13 migrations total)
```

✅ All tables created!

---

## Step 8: Seed Roles and Permissions

```bash
php artisan db:seed --class=RolePermissionSeeder
```

**Expected output:**
```
Database seeding completed successfully.
```

---

## Step 9: Create CEO User

```bash
php artisan tinker
```

Then paste this code:

```php
$user = \App\Models\User::create([
    'name' => 'O.B. Mighty CEO',
    'email' => 'admin@obmighty.com',
    'password' => bcrypt('password123'),
    'status' => 'active',
]);

$user->assignRole('ceo');

echo "✅ CEO user created!\n";
echo "Email: admin@obmighty.com\n";
echo "Password: password123\n";

exit
```

✅ CEO account ready!

---

## Step 10: Verify in phpMyAdmin

1. Go to **phpMyAdmin**: http://localhost/phpmyadmin
2. Click **obmighty** database in left sidebar
3. You should see **18+ tables**:
   - branches
   - users
   - cards
   - customers
   - payments
   - worker_daily_totals
   - branch_daily_totals
   - company_daily_totals
   - stock_items
   - stock_movements
   - expenses
   - ledger_entries
   - audit_logs
   - migrations
   - roles
   - permissions
   - model_has_roles
   - model_has_permissions
   - role_has_permissions
   - personal_access_tokens

✅ All tables created successfully!

---

## Step 11: Start Backend Server

```bash
php artisan serve
```

**Expected output:**
```
Starting Laravel development server: http://127.0.0.1:8000
```

✅ Backend running at: http://localhost:8000

**Keep this terminal open!**

---

## Step 12: Setup Frontend

Open a **NEW Command Prompt** window:

```bash
# Navigate to frontend folder
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected output:**
```
VITE v7.3.1  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

✅ Frontend running at: http://localhost:5173

**Keep this terminal open too!**

---

## Step 13: Access Your Application! 🎉

1. Open browser: **http://localhost:5173**
2. You'll see the **black and yellow login page** with O.B. Mighty logo!
3. Login with:
   - **Email:** admin@obmighty.com
   - **Password:** password123

---

## 🎨 What You'll See

### Login Page
- Black background with animated yellow glow
- O.B. Mighty logo at the top
- Yellow "Sign In" button

### Dashboard (After Login)
- **Yellow sidebar** on the left with your logo
- **Black main content** area
- CEO dashboard with company statistics
- Glowing yellow progress bars

---

## 🔧 Troubleshooting

### "composer: command not found"
**Solution:** Composer not installed or not in PATH
- Download from: https://getcomposer.org/download/
- Run installer and select `C:\xampp\php\php.exe`

### "Access denied for user 'root'@'localhost'"
**Solution:** Wrong MySQL password in `.env`
- Check your XAMPP MySQL password
- Update `DB_PASSWORD=` in `.env` file

### "Unknown database 'obmighty'"
**Solution:** Database not created
- Go to phpMyAdmin
- Create database named `obmighty`

### "Class 'Spatie\Permission\...' not found"
**Solution:** Dependencies not installed
- Run: `composer install`

### "npm: command not found"
**Solution:** Node.js not installed
- Download from: https://nodejs.org/
- Install LTS version

---

## 📊 Summary

After completing all steps, you'll have:

✅ Composer installed  
✅ Database `obmighty` created  
✅ All 18+ tables created automatically  
✅ CEO account ready  
✅ Backend running on port 8000  
✅ Frontend running on port 5173  
✅ Black & Yellow theme  
✅ O.B. Mighty logo integrated  

**Login URL:** http://localhost:5173  
**Email:** admin@obmighty.com  
**Password:** password123

---

## 🎯 Next Steps After Login

1. **Create Branches** - Add your branch locations
2. **Create Cards** - Define contribution card types
3. **Add Users** - Create secretaries and workers
4. **Add Customers** - Start managing customers
5. **Record Payments** - Begin tracking contributions

---

**Need help? All the files are ready, just follow the steps above!** 🚀
