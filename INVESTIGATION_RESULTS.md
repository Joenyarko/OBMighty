# Investigation Summary: Production Issues - CEO Dashboard & Image Display

## Issues Reported
1. **CEO Dashboard not showing data on cards** (staff count, expenses, revenue totals, etc.)
2. **Images no longer displaying** (unclear scope - all images or specific ones)
3. **Old database data not adding up with new data**

---

## Root Cause Analysis

### Issue #1: Image Display Broken ✅ FIXED

**Root Cause:** Logo URLs stored in database with hard-coded environment hostname
- The Admin CompanyController was using `url('storage/' . $path)` which generates full URLs with the current APP_URL
- In development: `http://localhost:5173/storage/companies/{filename}.jpg`
- These full URLs were persisted in the database
- When deployed to VPS with different APP_URL, the database URLs still referenced localhost:5173

**Evidence:**
```
Database stored: http://localhost:5173/storage/companies/eIQoHT8Qm1xHm8pZhrClSLm8pqcm2WSiDkHK74u4.jpg
This URL doesn't work on VPS where APP_URL is different
Logo files actually stored in: storage/app/public/companies/
```

**Fix Applied:**
1. **Updated Admin CompanyController** to use ImageUploadService consistently:
   - Before: `$validated['logo_url'] = url('storage/' . $path);`
   - After: Use `ImageUploadService` which stores relative paths like `/api/images/logos/{filename}`
   
2. **Added Database Migration** (`2024_02_15_fix_logo_urls.php`):
   - Converts all existing full URLs to relative paths
   - Example: `http://localhost:5173/storage/companies/file.jpg` → `/storage/companies/file.jpg`
   - Accessor (`Company.php`) then transforms relative paths to correct full URL based on current APP_URL
   
3. **Company Model Accessor** correctly handles:
   - Full URLs: Returns as-is if already has `http://`
   - Relative paths: Ensures `/storage/` prefix and calls `url()` helper to generate correct URL
   - Works across all environments: URLs adapt based on current APP_URL configuration

**Files Changed:**
- `app/Http/Controllers/Api/Admin/CompanyController.php` - Lines 72-84, 130-134
- `database/migrations/2024_02_15_fix_logo_urls.php` - NEW FILE
- `app/Models/Company.php` - No changes (accessor already correct)

---

### Issue #2: Dashboard Not Showing Data ⚠️ PARTIALLY INVESTIGATED

**Status:** Code architecture appears correct, but actual data issue requires database inspection

**Possible Root Causes:**
1. **Most Likely:** CEO user doesn't have `company_id` assigned
   - Field exists in User model: `'company_id'` in fillable array
   - If NULL, `$user->company` in controller returns NULL
   - Controller returns 404 error before querying data
   
2. **Secondary:** Existing data has NULL `company_id` and CompanySeeder hasn't been run
   - CompanySeeder updates all NULL company_id values to newly created company ID
   - NOT called by default in DatabaseSeeder - must be run manually
   
3. **Tertiary:** Dashboard queries are correct but data genuinely doesn't exist
   - All query logic in CompanyDashboardController appears sound
   - Properly filters by company_id

**Investigation Done:**
- ✅ Verified CompanyDashboardController queries look correct
- ✅ Verified all models have proper company_id relationships
- ✅ Verified routes are registered correctly: `GET /company/dashboard`
- ✅ Verified Company model has correct relationships (users(), customers(), payments(), etc.)
- ⚠️ Unable to directly inspect: database row values, CEO user company assignment, API response data

**Recommended Next Steps:**
1. **Verify CEO User Setup:**
   ```bash
   # Login to application as CEO
   # Navigate to admin panel
   # Confirm the CEO user has: role='ceo' AND company_id is assigned (not NULL)
   ```

2. **Run CompanySeeder if needed:**
   ```bash
   php artisan db:seed --class=CompanySeeder
   ```

3. **Check Database Directly:**
   ```bash
   # Verify a specific user: SELECT * FROM users WHERE role='ceo' LIMIT 1;
   # Confirm company_id is set (not NULL)
   # Confirm company exists: SELECT * FROM companies WHERE id={company_id};
   ```

4. **Add Debug Info to Frontend:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Trigger dashboard load
   - Check the response from `/company/dashboard` API call
   - Look for: empty arrays, null values, or error messages

---

## Changes Implemented

### Code Changes
| File | Change | Type |
|------|--------|------|
| Admin CompanyController | Replace direct storage path with ImageUploadService | Fix |
| Database Migration 2024_02_15 | Convert full URLs to relative paths | Fix |
| CompanyDashboardController | Already correct, no changes needed | Verified |

### Commits
```
1c0275cc - fix: logo URL handling - use ImageUploadService and fix stored paths
  - Fix Admin CompanyController to use ImageUploadService
  - Add migration to convert existing full URLs to relative paths
  - Ensure logo paths work across different environments
```

---

## Architecture Notes

### Multi-Tenant Setup
- Each company identified by `company_id` foreign key
- Users belong to company via `company_id` 
- All data (payments, customers, expenses, etc.) filtered by company
- Tenant resolution via hostname/subdomain in middleware

### Asset Serving
- **App Assets:** Served from `public/` directory by web server
- **User-Uploaded Files:** Stored in `storage/app/public/` directory
- **Public Access:** Symbolic link `public/storage` → `storage/app/public/`
- **Access Pattern:** `/storage/{folder}/{filename}` (handled by symlink)
- **API Endpoint:** `GET /api/images/{folder}/{filename}` (for explicit image serving)

### URL Generation
- Database stores relative paths: `/storage/company/file.jpg` or `/api/images/logos/file.jpg`
- Model accessors transform to full URLs: `http://example.com/storage/company/file.jpg`
- APP_URL configuration ensures correct domain in generated URLs
- Works across dev, staging, production with different domains

---

## Testing Recommendations

1. **Logo Display Test:**
   - Load dashboard on VPS
   - Verify company logo appears correctly
   - Check browser Network tab for logo URL
   - Confirm URL uses correct domain (not localhost:5173)

2. **Dashboard Data Test:**
   - Login as CEO user
   - Navigate to company dashboard
   - Verify all KPI cards show data:
     - Today's Revenue
     - Month Revenue
     - Active Customers
     - Completion Rate
   - If showing zeros, run CompanySeeder to assign data to company

3. **Database Validation:**
   ```bash
   # Check CEO user company assignment
   php artisan tinker
   > User::where('role', 'ceo')->with('company')->first();
   # Verify company_id is not NULL and company exists
   ```

---

## Files to Review for Next Steps

- `/database/seeders/DatabaseSeeder.php` - Consider calling CompanySeeder
- `/database/seeders/CompanySeeder.php` - Docs on how it assigns data to companies
- `/app/Http/Controllers/Api/CompanyDashboardController.php` - Dashboard queries (verified correct)
- `/app/Models/Company.php` - Logo URL accessor (verified correct)

---

## Deployment Checklist

- [ ] Run migrations: `php artisan migrate`
- [ ] Verify symbolic link exists: `public/storage` → `storage/app/public`
- [ ] Run CompanySeeder if database restored from backup: `php artisan db:seed --class=CompanySeeder`
- [ ] Verify CEO user has company_id assigned
- [ ] Test logo display on production domain
- [ ] Test dashboard shows data
- [ ] Check logging for any dashboard access errors
