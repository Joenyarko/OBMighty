# XAMPP Setup Guide for O.B. Mighty

## ✅ You're Using XAMPP - Perfect!

Since you have XAMPP, the setup is very straightforward. **You don't need to create tables manually** - Laravel migrations will do everything automatically!

---

## 🚀 Quick Setup (3 Easy Steps)

### Step 1: Create Database in phpMyAdmin

1. **Start XAMPP Control Panel**
   - Start **Apache**
   - Start **MySQL** (should be on port 3307)

2. **Open phpMyAdmin**
   - Go to: http://localhost/phpmyadmin
   - Or click "Admin" button next to MySQL in XAMPP

3. **Create Database**
   - Click **"New"** in the left sidebar
   - Database name: `obmighty`
   - Collation: Select `utf8mb4_unicode_ci`
   - Click **"Create"**

✅ That's it! Database created.

---

### Step 2: Update .env File

The `.env` file is already created at:
```
c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend\.env
```

**Just add your MySQL password:**

Open the file and update this line:
```env
DB_PASSWORD=
```

If you haven't set a MySQL password in XAMPP, leave it empty:
```env
DB_PASSWORD=
```

If you have a password, add it:
```env
DB_PASSWORD=your_password
```

---

### Step 3: Run Laravel Migrations (Automatic Table Creation)

Open **Command Prompt** or **PowerShell** and run:

```bash
# Navigate to backend folder
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend

# Install Composer dependencies
composer install

# Generate application key
php artisan key:generate

# Run migrations - This creates ALL tables automatically!
php artisan migrate

# Seed roles and permissions
php artisan db:seed --class=RolePermissionSeeder
```

**What happens:**
- Laravel reads all 13 migration files
- Creates all tables automatically in the `obmighty` database
- Sets up foreign keys, indexes, and constraints
- Creates Spatie permission tables

**Expected Output:**
```
Migration table created successfully.
Migrating: 2024_01_01_000001_create_branches_table
Migrated:  2024_01_01_000001_create_branches_table (45.67ms)
Migrating: 2024_01_01_000002_create_users_table
Migrated:  2024_01_01_000002_create_users_table (52.34ms)
...
(continues for all 13 migrations)
```

✅ All tables created automatically!

---

## 📊 Verify in phpMyAdmin

After running migrations:

1. Go back to **phpMyAdmin**
2. Click on **obmighty** database in the left sidebar
3. You should see **18+ tables** created:

**Core Tables:**
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

**Spatie Permission Tables:**
- migrations
- roles
- permissions
- model_has_roles
- model_has_permissions
- role_has_permissions
- personal_access_tokens

---

## 👤 Create CEO User

After migrations are complete, create your admin user:

```bash
php artisan tinker
```

Then paste this:

```php
$user = \App\Models\User::create([
    'name' => 'O.B. Mighty CEO',
    'email' => 'admin@obmighty.com',
    'password' => bcrypt('password123'),
    'status' => 'active',
]);

$user->assignRole('ceo');

echo "✅ CEO user created successfully!\n";
echo "Email: admin@obmighty.com\n";
echo "Password: password123\n";

exit
```

---

## 🎯 Start the Application

**Terminal 1 - Backend:**
```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend
php artisan serve
```
✅ Backend running at: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-frontend
npm install
npm run dev
```
✅ Frontend running at: http://localhost:5173

---

## 🌐 Access Your App

1. Open browser: **http://localhost:5173**
2. See the **black & yellow login page** with O.B. Mighty logo
3. Login:
   - **Email:** admin@obmighty.com
   - **Password:** password123

---

## ❌ Common Issues

### "Access denied for user 'root'@'localhost'"

**Solution:** Update `.env` file with correct password
```env
DB_PASSWORD=your_xampp_mysql_password
```

### "Unknown database 'obmighty'"

**Solution:** Database not created in phpMyAdmin
- Go to phpMyAdmin
- Create database named `obmighty`
- Run migrations again

### "Class 'Spatie\Permission\...' not found"

**Solution:** Install Spatie package
```bash
composer require spatie/laravel-permission
```

### "php artisan: command not found"

**Solution:** PHP not in PATH
- Use full path: `C:\xampp\php\php.exe artisan migrate`
- Or add `C:\xampp\php` to your system PATH

---

## 📝 Summary

**DO NOT create tables manually!** Laravel migrations will:

✅ Create all 13 core tables  
✅ Create 5+ permission tables  
✅ Set up all foreign keys  
✅ Add all indexes  
✅ Configure constraints  
✅ Set proper data types  

**You only need to:**
1. Create empty database `obmighty` in phpMyAdmin
2. Run `php artisan migrate`
3. Done! All tables created automatically

---

## 🎉 That's It!

Your O.B. Mighty Contribution Manager will be ready with:

✅ Database: obmighty (port 3307)  
✅ All tables created automatically  
✅ Black & Yellow theme  
✅ O.B. Mighty logo  
✅ CEO account ready  

**Login at:** http://localhost:5173  
**Email:** admin@obmighty.com  
**Password:** password123
