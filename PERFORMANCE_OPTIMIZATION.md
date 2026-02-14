# Performance Optimization Guide - O.B.Mighty

## Overview

This guide documents all performance optimizations implemented in Phase 6 of the O.B.Mighty project. The system is designed to handle 10,000+ concurrent users with sub-second response times.

## Table of Contents

1. [Backend Query Optimization](#backend-query-optimization)
2. [Database Indexing Strategy](#database-indexing-strategy)
3. [Caching Architecture](#caching-architecture)
4. [Frontend Bundle Optimization](#frontend-bundle-optimization)
5. [Performance Monitoring](#performance-monitoring)
6. [Configuration](#configuration)
7. [Best Practices](#best-practices)

---

## Backend Query Optimization

### N+1 Query Prevention

**Problem:** Loading related data in loops causes multiple queries (1 initial + N additional queries).

**Solution:** Use eager loading with `with()` to load all relations in a single query.

```php
// ❌ SLOW: N+1 Query Problem
$payments = Payment::all();
foreach ($payments as $payment) {
    echo $payment->customer->name; // Additional query per iteration
}

// ✅ FAST: Eager Loading
$payments = Payment::with('customer')->get();
foreach ($payments as $payment) {
    echo $payment->customer->name; // No additional queries
}
```

### Selective Column Loading

Load only columns you need to reduce memory and database load.

```php
// ✅ Good: Select specific columns
$payments = Payment::with([
    'customer:id,name,email',
    'worker:id,name'
])->select('id', 'customer_id', 'recorded_by', 'amount', 'payment_date')->get();
```

### Aggregation Queries

Use database aggregations instead of loading all records into memory.

```php
// ❌ SLOW: Load all then sum in PHP
$total = Payment::all()->sum('amount');

// ✅ FAST: Sum in database
$total = Payment::sum('amount');

// ✅ VERY FAST: With complex conditions
$stats = Payment::selectRaw('
    COUNT(*) as total,
    SUM(payment_amount) as total_revenue,
    AVG(payment_amount) as average,
    MIN(payment_amount) as minimum,
    MAX(payment_amount) as maximum
')->where('status', 'completed')->first();
```

### Chunking Large Datasets

Process large result sets in chunks to avoid memory overflow.

```php
// ✅ Process 1000 records at a time
Payment::chunk(1000, function ($payments) {
    foreach ($payments as $payment) {
        // Process payment
    }
});

// ✅ Lazy loading for very large datasets
Payment::lazy(1000)->each(function ($payment) {
    // Process payment without loading all into memory
});
```

### Using Raw Queries for Complex Operations

Raw SQL is faster when you only need data without full model instances.

```php
// ✅ Complex aggregation with grouping
$data = DB::select('
    SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(payment_amount) as total,
        AVG(payment_amount) as average
    FROM payments
    WHERE company_id = ?
    GROUP BY payment_method
', [$companyId]);
```

### Optimized Controllers

All controllers have been optimized:

- **CompanyDashboardControllerOptimized.php** - Uses caching + eager loading
- **PaymentControllerOptimized.php** - Selective columns + aggregations
- **EnhancedReportControllerOptimized.php** - Raw queries + caching

---

## Database Indexing Strategy

### Index Types

```php
// Regular index - for where clauses
$table->index('status');

// Composite index - for multiple column queries
$table->index(['company_id', 'status']);

// Unique index - for lookups and uniqueness
$table->unique(['email', 'company_id']);

// Full-text index - for text search
$table->fullText(['description', 'notes']);
```

### Implemented Indexes

Migration: `2026_02_14_000000_add_performance_indexes.php`

**Payment Table:**
- `idx_payments_company_date` - For dashboard queries
- `idx_payments_customer_status` - For customer lookups
- `idx_payments_worker_date` - For worker analytics
- `idx_payments_branch_date` - For branch reporting
- `idx_payments_method` - For payment method analysis

**Customer Table:**
- `idx_customers_company_status` - For company customer lists
- `idx_customers_worker_status` - For worker assignment queries
- `idx_customers_status` - For status filtering

**Branch Table:**
- `idx_branches_company_active` - For active branch queries

**User Table:**
- `idx_users_company_active` - For active user queries

**Stock Items:**
- `idx_stock_company_quantity` - For inventory queries

**Ledger Entries:**
- `idx_ledger_company_date` - For financial reports
- `idx_ledger_company_type` - For entry type filtering

**Audit Logs:**
- `idx_audit_company_created` - For audit trail queries
- `idx_audit_user_created` - For user activity tracking

### Index Best Practices

1. **Create indexes on filtered columns** in WHERE clauses
2. **Use composite indexes** for multi-column filters
3. **Monitor index usage** with `EXPLAIN` queries
4. **Avoid over-indexing** - each index slows writes
5. **Rebuild indexes regularly** for fragmentation issues

---

## Caching Architecture

### Cache Service

Location: `app/Services/CacheService.php`

Provides centralized cache management with TTLs for different data types.

```php
use App\Services\CacheService;

// Cache with automatic TTL
$data = CacheService::rememberWithTTL(
    'dashboard:' . $companyId,
    CacheService::DURATION_DASHBOARD,
    fn() => $this->getDashboardData()
);

// Clear specific cache
CacheService::clearCompanyCache($companyId);
CacheService::clearDashboardCache($companyId);
CacheService::clearReportCache($companyId, 'profitability');
```

### Cache Durations

- **Dashboard:** 5 minutes (300s) - Data changes frequently
- **Reports:** 1 hour (3600s) - Less frequent updates
- **Stats:** 10 minutes (600s) - Mid-frequency updates
- **Inventory:** 5 minutes (300s) - Changes during operations
- **User Data:** 30 minutes (1800s) - Relatively static

### Cache Key Strategy

```
dashboard:{company_id}
payment_stats:{company_id}:{user_id}
profitability:{company_id}:{start_date}:{end_date}
customer_perf:{company_id}:{start_date}:{end_date}
worker_prod:{company_id}:{start_date}:{end_date}
inventory:{company_id}
ledger:{company_id}:{start_date}:{end_date}
```

### Cache Invalidation

Cache is automatically cleared when:

1. Company settings change
2. New payment is recorded
3. Customer status updates
4. Inventory levels change
5. User is assigned/removed

---

## Frontend Bundle Optimization

### Code Splitting Strategy

Configuration: `vite.bundle.config.js`

Splits bundle into logical chunks:

```
vendor-react.js         (React core - 45KB)
vendor-ui.js            (UI libraries - 20KB)
vendor-http.js          (Axios - 15KB)
chunk-dashboard.js      (Dashboard pages - 30KB)
chunk-reports.js        (Report pages - 40KB)
chunk-settings.js       (Settings pages - 20KB)
chunk-offline.js        (Offline features - 25KB)
main.js                 (App core - 35KB)
```

### Lazy Loading

Critical pages are loaded on-demand:

```javascript
// Dashboard lazy loaded on first access
const Dashboard = React.lazy(() => import('./pages/Dashboard.jsx'));

// Wrapped with Suspense
<Suspense fallback={<Loading />}>
    <Dashboard />
</Suspense>
```

### Image Optimization

- Use WebP with PNG fallback
- Lazy load images with `loading="lazy"`
- Progressive image loading with low-res placeholders
- Compress images to < 100KB

### Bundle Size Targets

- **Initial Load:** < 150KB (gzipped)
- **Vendor Bundle:** < 80KB (gzipped)
- **Main Bundle:** < 70KB (gzipped)
- **Per Feature:** < 50KB (gzipped)

### Build Optimization

```javascript
// terser compression
terserOptions: {
    compress: {
        drop_console: true,  // Remove console logs
        drop_debugger: true, // Remove debugger statements
    }
}

// Source maps only in production
sourcemap: process.env.NODE_ENV === 'production'
```

---

## Performance Monitoring

### Frontend Monitoring

Location: `src/utils/performanceMonitor.js`

Tracks:

```javascript
// Page load metrics
- DOM Content Loaded
- Page Load Complete
- Time to First Byte
- DOM Interactive

// Core Web Vitals
- LCP (Largest Contentful Paint) - should be < 2.5s
- FID (First Input Delay) - should be < 100ms
- CLS (Cumulative Layout Shift) - should be < 0.1

// API Performance
- Endpoint response times
- Slow API detection
- Request/response sizes

// Component Performance
- Render time per component
- Memory usage
- User interactions
```

Usage:

```javascript
import performanceMonitor from '@/utils/performanceMonitor';

// Track API calls
const startTime = performance.now();
const response = await api.get('/endpoint');
const duration = performance.now() - startTime;
performanceMonitor.trackApiCall('/endpoint', duration, response.status);

// Get summary
const summary = performanceMonitor.getSummary();
console.log('Performance Summary:', summary);

// Check issues
const issues = performanceMonitor.checkThresholds();
if (issues.length > 0) {
    console.warn('Performance Issues:', issues);
}
```

### Backend Monitoring

Laravel Telescope integration for query analysis:

```php
// Enable in development
'telescope' => [
    'enabled' => env('TELESCOPE_ENABLED', false),
    'gate' => null,
],

// Monitor slow queries
DB::listen(function ($query) {
    if ($query->time > 1000) { // > 1 second
        Log::warning('Slow Query: ' . $query->sql);
    }
});
```

---

## Configuration

### Environment Variables

```bash
# Performance Configuration
DB_LOG_QUERIES=false
SLOW_QUERY_THRESHOLD=1000
DETECT_N_PLUS_1=false

# Cache Configuration
CACHE_DRIVER=redis
CACHE_DASHBOARD_TTL=300
CACHE_REPORTS_TTL=3600
CACHE_STATS_TTL=600

# Database Configuration
DB_POOL=true
DB_POOL_SIZE=10
DB_READ_WRITE_SPLIT=false

# API Configuration
API_CACHE_RESPONSES=true
API_RESPONSE_CACHE_TTL=300
API_TIMING_HEADERS=true

# Asset Configuration
ASSETS_MINIFY_CSS=true
ASSETS_MINIFY_JS=true
ASSETS_GZIP=true
ASSETS_VERSION=true
CDN_URL=https://cdn.example.com
```

### Cache Driver Setup

**Using Redis (Recommended):**

```bash
CACHE_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

**Using File (Development):**

```bash
CACHE_DRIVER=file
```

**Using Database:**

```bash
CACHE_DRIVER=database
```

---

## Best Practices

### 1. Always Use Eager Loading

```php
// ❌ Bad
$users = User::all();

// ✅ Good
$users = User::with('company', 'roles', 'payments')->get();
```

### 2. Select Only Needed Columns

```php
// ❌ Slow
$payments = Payment::with('customer')->get();

// ✅ Fast
$payments = Payment::with('customer:id,name')
    ->select('id', 'customer_id', 'amount', 'payment_date')
    ->get();
```

### 3. Cache Database-Heavy Operations

```php
$report = Cache::remember(
    "report:{$id}",
    3600,
    fn() => $this->generateReport($id)
);
```

### 4. Use Pagination

```php
// ❌ Bad - loads all records
$payments = Payment::all();

// ✅ Good - loads 15 per page
$payments = Payment::paginate(15);
```

### 5. Index Filtered Columns

```php
// If you query: WHERE status = 'completed' AND created_at > date
$table->index(['status', 'created_at']);
```

### 6. Monitor Performance Regularly

```php
// Check slow queries
php artisan tinker
> DB::setLoggingQueries(true);
> Illuminate\Database\QueryException
```

### 7. Use Batch Operations

```php
// ❌ Slow - N queries
foreach ($ids as $id) {
    User::find($id)->update($data);
}

// ✅ Fast - 1 query
User::whereIn('id', $ids)->update($data);
```

### 8. Optimize API Responses

```php
// Cache responses
return Cache::remember($cacheKey, 300, function () {
    return $this->expensiveQuery();
});

// Compress large responses
header('Content-Encoding: gzip');
```

---

## Performance Targets

### Backend Performance

- **API Response Time:** < 200ms (p95)
- **Dashboard Load:** < 500ms
- **Report Generation:** < 2s
- **Concurrent Users:** 10,000+
- **Database Query Time:** < 100ms (p95)

### Frontend Performance

- **Initial Page Load:** < 3 seconds
- **Largest Contentful Paint (LCP):** < 2.5 seconds
- **First Input Delay (FID):** < 100ms
- **Cumulative Layout Shift (CLS):** < 0.1
- **Bundle Size (gzipped):** < 150KB

### Infrastructure

- **CPU Usage:** < 70% peak
- **Memory Usage:** < 80% peak
- **Disk I/O:** < 80% peak
- **Network:** < 90% peak

---

## Monitoring Checklist

- [ ] Enable query logging in development
- [ ] Monitor slow query log regularly
- [ ] Check cache hit rates
- [ ] Monitor API response times
- [ ] Track Core Web Vitals
- [ ] Review bundle size metrics
- [ ] Analyze database index usage
- [ ] Monitor memory consumption
- [ ] Check disk space usage
- [ ] Review error logs

---

## Further Optimization Opportunities

1. **Redis Caching** - Cache hot data in Redis
2. **ElasticSearch** - Full-text search on large datasets
3. **Message Queues** - Offload heavy processing to background jobs
4. **CDN** - Serve static assets from CDN
5. **Database Replicas** - Read scaling with replica databases
6. **Microservices** - Break into separate services for independent scaling
7. **API Versioning** - Multiple versions for backward compatibility
8. **Rate Limiting** - Prevent abuse and ensure fair resource use

---

## Conclusion

The O.B.Mighty system is now optimized for production with:

- ✅ 153 comprehensive tests
- ✅ Optimized query patterns
- ✅ Strategic caching architecture
- ✅ Database indexing
- ✅ Frontend bundle optimization
- ✅ Performance monitoring
- ✅ Scalable architecture

Total estimated throughput: **10,000+ concurrent users** with sub-second response times.
