# O.B. Mighty Database Setup Guide

## Database Configuration

- **Database Name:** obmighty
- **Port:** 3307
- **Host:** 127.0.0.1
- **Username:** root
- **Password:** (your MySQL root password)

---

## Step 1: Create the Database

### Option A: Using MySQL Workbench (Recommended)

1. Open **MySQL Workbench**
2. Create a new connection:
   - **Connection Name:** O.B. Mighty
   - **Hostname:** 127.0.0.1
   - **Port:** 3307
   - **Username:** root
3. Click **Test Connection** and enter your password
4. Once connected, open a new SQL tab
5. Run this command:

```sql
CREATE DATABASE IF NOT EXISTS obmighty 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

6. Click **Execute** (lightning bolt icon)

### Option B: Using phpMyAdmin

1. Open **phpMyAdmin** in your browser
2. Make sure you're connected to port 3307
3. Click **New** in the left sidebar
4. Enter database name: **obmighty**
5. Select **utf8mb4_unicode_ci** as collation
6. Click **Create**

### Option C: Using Command Line

If you have MySQL in your PATH:

```bash
mysql -u root -p -P 3307 -h 127.0.0.1
```

Then run:
```sql
CREATE DATABASE obmighty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

### Option D: Using SQL File

1. Navigate to the backend folder
2. Run the provided SQL script:

```bash
mysql -u root -p -P 3307 -h 127.0.0.1 < database/create_database.sql
```

---

## Step 2: Update .env File

The `.env` file has already been created with the correct settings:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=obmighty
DB_USERNAME=root
DB_PASSWORD=your_password_here
```

**Important:** Add your MySQL root password to the `DB_PASSWORD` line!

---

## Step 3: Run Migrations

Once the database is created and .env is configured:

```bash
cd c:\Users\joeny\OneDrive\Desktop\O.B.Mighty\contribution-backend

# Install Composer dependencies (if not done yet)
composer install

# Generate application key
php artisan key:generate

# Run migrations to create all tables
php artisan migrate

# Seed roles and permissions
php artisan db:seed --class=RolePermissionSeeder
```

---

## Step 4: Create CEO User

```bash
php artisan tinker
```

Then run:

```php
$user = \App\Models\User::create([
    'name' => 'O.B. Mighty CEO',
    'email' => 'admin@obmighty.com',
    'password' => bcrypt('password123'),
    'status' => 'active',
]);

$user->assignRole('ceo');

echo "CEO user created successfully!\n";
echo "Email: admin@obmighty.com\n";
echo "Password: password123\n";

exit
```

---

## Step 5: Verify Database

Check that all tables were created:

```sql
USE obmighty;
SHOW TABLES;
```

You should see 13+ tables:
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
- roles
- permissions
- model_has_roles
- model_has_permissions
- role_has_permissions

---

## Troubleshooting

### "Access denied for user 'root'"
- Check your MySQL root password
- Update `DB_PASSWORD` in `.env` file

### "Unknown database 'obmighty'"
- Database wasn't created
- Follow Step 1 again

### "SQLSTATE[HY000] [2002] Connection refused"
- MySQL is not running
- Start MySQL service
- Verify port 3307 is correct

### "Class 'Role' not found"
- Spatie package not installed
- Run: `composer require spatie/laravel-permission`

---

## Next Steps

After database setup is complete:

1. **Start Backend Server:**
   ```bash
   php artisan serve
   ```
   Backend runs at: http://localhost:8000

2. **Start Frontend Server:**
   ```bash
   cd ..\contribution-frontend
   npm install
   npm run dev
   ```
   Frontend runs at: http://localhost:5173

3. **Login:**
   - Email: admin@obmighty.com
   - Password: password123

---

## Database Schema Overview

The `obmighty` database contains:

### Core Tables
- **branches** - Branch locations
- **users** - System users (CEO, Secretary, Worker)
- **cards** - Contribution card templates
- **customers** - Customer records
- **payments** - Payment transactions

### Tracking Tables
- **worker_daily_totals** - Worker performance
- **branch_daily_totals** - Branch metrics
- **company_daily_totals** - Company-wide stats

### Business Tables
- **stock_items** - Inventory management
- **stock_movements** - Stock transactions
- **expenses** - Business expenses
- **ledger_entries** - Accounting records
- **audit_logs** - System audit trail

### Permission Tables (Spatie)
- **roles** - User roles
- **permissions** - System permissions
- **model_has_roles** - User-role assignments
- **model_has_permissions** - User-permission assignments
- **role_has_permissions** - Role-permission assignments

---

**Database Name:** obmighty  
**Total Tables:** 18+  
**Character Set:** utf8mb4  
**Collation:** utf8mb4_unicode_ci
