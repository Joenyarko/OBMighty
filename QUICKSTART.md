# O.B. Mighty Contribution Manager - Complete Setup

## 🎨 Your Customized Application

- **Company Name:** O.B. Mighty
- **Database:** obmighty (port 3307)
- **Theme:** Black & Yellow
- **Logo:** Integrated throughout

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **PHP 8.1+** installed
- [ ] **Composer** installed
- [ ] **MySQL 8.0+** running on port 3307
- [ ] **Node.js 18+** and npm installed
- [ ] **MySQL root password** ready

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Create Database

**Choose ONE method:**

**A. MySQL Workbench (Easiest)**
1. Open MySQL Workbench
2. Connect to localhost:3307
3. Run: `CREATE DATABASE obmighty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

**B. phpMyAdmin**
1. Open phpMyAdmin
2. Click "New"
3. Database name: `obmighty`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

**C. Command Line**
```bash
mysql -u root -p -P 3307 -h 127.0.0.1 -e "CREATE DATABASE obmighty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

### Step 2: Configure Backend

```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend

# Install dependencies
composer install

# The .env file is already created, just add your MySQL password
# Edit .env and update this line:
# DB_PASSWORD=your_mysql_password

# Generate application key
php artisan key:generate
```

---

### Step 3: Run Migrations

```bash
# Create all database tables
php artisan migrate

# Seed roles and permissions
php artisan db:seed --class=RolePermissionSeeder
```

Expected output:
```
Migration table created successfully.
Migrating: 2024_01_01_000001_create_branches_table
Migrated:  2024_01_01_000001_create_branches_table
...
(13 migrations total)
```

---

### Step 4: Create CEO User

```bash
php artisan tinker
```

Copy and paste this:

```php
$user = \App\Models\User::create([
    'name' => 'O.B. Mighty CEO',
    'email' => 'admin@obmighty.com',
    'password' => bcrypt('password123'),
    'status' => 'active',
]);
$user->assignRole('ceo');
echo "✅ CEO user created!\n";
exit
```

---

### Step 5: Start Servers

**Terminal 1 - Backend:**
```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend
php artisan serve
```
✅ Backend: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-frontend
npm install
npm run dev
```
✅ Frontend: http://localhost:5173

---

## 🎯 Access Your Application

1. Open browser: **http://localhost:5173**
2. You'll see the **black and yellow themed login page** with O.B. Mighty logo
3. Login with:
   - **Email:** admin@obmighty.com
   - **Password:** password123

---

## 🎨 What You'll See

### Login Page
- Black background with animated yellow glow
- O.B. Mighty logo at the top
- Yellow "Sign In" button

### Dashboard
- **Yellow sidebar** on the left with your logo
- **Black main content** area
- CEO dashboard with company-wide statistics
- Glowing yellow progress bars

### Navigation
- 📊 Dashboard - Company overview
- 👥 Customers - Manage customers
- 📈 Reports - View reports
- 🏢 Branches - Manage branches (CEO only)
- 💳 Cards - Manage contribution cards (CEO only)

---

## 📊 Database Information

- **Name:** obmighty
- **Port:** 3307
- **Tables:** 18+ tables created
- **Character Set:** utf8mb4
- **Collation:** utf8mb4_unicode_ci

### Tables Created:
✅ branches  
✅ users  
✅ cards  
✅ customers  
✅ payments  
✅ worker_daily_totals  
✅ branch_daily_totals  
✅ company_daily_totals  
✅ stock_items  
✅ stock_movements  
✅ expenses  
✅ ledger_entries  
✅ audit_logs  
✅ roles & permissions (Spatie)

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check PHP version
php -v

# Clear cache
php artisan cache:clear
php artisan config:clear

# Check .env file has DB_PASSWORD set
```

### Database connection error
```bash
# Verify MySQL is running on port 3307
# Check .env file:
DB_PORT=3307
DB_DATABASE=obmighty
DB_PASSWORD=your_password
```

### Frontend won't start
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Check Node version
node -v  # Should be 18+
```

### Can't login
- Verify backend is running (http://localhost:8000)
- Check CEO user was created
- Try password: password123

---

## 📱 Next Steps After Login

1. **Create a Branch**
   - Go to Branches (CEO only)
   - Add your first branch location

2. **Create Contribution Cards**
   - Go to Cards (CEO only)
   - Define card types (e.g., "Daily Card - $10/box, 30 boxes")

3. **Add Secretary**
   - Create user account
   - Assign "secretary" role
   - Assign to a branch

4. **Add Workers**
   - Create user accounts
   - Assign "worker" role
   - Assign to a branch

5. **Add Customers**
   - Workers can add their customers
   - Select card type
   - Start recording payments

---

## 🎉 You're All Set!

Your **O.B. Mighty Contribution Manager** is now running with:

✅ Black & Yellow theme  
✅ O.B. Mighty logo  
✅ Database: obmighty on port 3307  
✅ CEO account ready  
✅ All 13 migrations completed  
✅ Role-based access control  
✅ Mobile-responsive PWA  

**Login URL:** http://localhost:5173  
**Email:** admin@obmighty.com  
**Password:** password123

---

## 📚 Additional Documentation

- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Detailed database setup
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [README.md](README.md) - Project overview

---

**Need help? Check the troubleshooting section or review the detailed guides!** 🚀
