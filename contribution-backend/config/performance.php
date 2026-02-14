<?php

/**
 * config/performance.php
 * Performance optimization configuration
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Query Optimization
    |--------------------------------------------------------------------------
    */
    'queries' => [
        // Enable query logging in development
        'log_queries' => env('DB_LOG_QUERIES', false),

        // Slow query threshold in milliseconds
        'slow_query_threshold' => env('SLOW_QUERY_THRESHOLD', 1000),

        // Enable N+1 query detection
        'detect_n_plus_1' => env('DETECT_N_PLUS_1', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Caching Strategy
    |--------------------------------------------------------------------------
    */
    'cache' => [
        // Default cache driver
        'driver' => env('CACHE_DRIVER', 'file'),

        // Cache TTLs
        'ttl' => [
            'dashboard' => env('CACHE_DASHBOARD_TTL', 300), // 5 minutes
            'reports' => env('CACHE_REPORTS_TTL', 3600), // 1 hour
            'stats' => env('CACHE_STATS_TTL', 600), // 10 minutes
            'inventory' => env('CACHE_INVENTORY_TTL', 300), // 5 minutes
            'user_data' => env('CACHE_USER_DATA_TTL', 1800), // 30 minutes
        ],

        // Cache invalidation on events
        'invalidate_on_change' => true,

        // Cache warming on schedule
        'warm_cache' => env('CACHE_WARM', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Database Optimization
    |--------------------------------------------------------------------------
    */
    'database' => [
        // Enable connection pooling
        'use_connection_pool' => env('DB_POOL', false),

        // Connection pool size
        'pool_size' => env('DB_POOL_SIZE', 10),

        // Read-write splitting
        'read_write_split' => env('DB_READ_WRITE_SPLIT', false),

        // Enable query caching in database
        'query_cache' => env('DB_QUERY_CACHE', false),

        // Connection timeout in seconds
        'connection_timeout' => env('DB_CONNECTION_TIMEOUT', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */
    'pagination' => [
        // Default per page
        'per_page' => env('PAGINATION_PER_PAGE', 15),

        // Maximum per page
        'max_per_page' => env('PAGINATION_MAX_PER_PAGE', 100),

        // Default pagination style
        'style' => 'bootstrap',
    ],

    /*
    |--------------------------------------------------------------------------
    | API Response Optimization
    |--------------------------------------------------------------------------
    */
    'api' => [
        // Compress responses larger than this size (bytes)
        'compress_response_size' => env('API_COMPRESS_SIZE', 1024), // 1KB

        // Enable response caching
        'cache_responses' => env('API_CACHE_RESPONSES', true),

        // Default response cache TTL
        'response_cache_ttl' => env('API_RESPONSE_CACHE_TTL', 300),

        // Include timing headers
        'include_timing_headers' => env('API_TIMING_HEADERS', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Frontend Asset Optimization
    |--------------------------------------------------------------------------
    */
    'assets' => [
        // Minify CSS
        'minify_css' => env('ASSETS_MINIFY_CSS', true),

        // Minify JavaScript
        'minify_js' => env('ASSETS_MINIFY_JS', true),

        // Enable gzip compression
        'gzip_compression' => env('ASSETS_GZIP', true),

        // Asset versioning for cache busting
        'version_assets' => env('ASSETS_VERSION', true),

        // CDN URL for static assets
        'cdn_url' => env('CDN_URL', null),

        // Image optimization
        'optimize_images' => env('ASSETS_OPTIMIZE_IMAGES', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Monitoring
    |--------------------------------------------------------------------------
    */
    'monitoring' => [
        // Enable performance monitoring
        'enabled' => env('PERFORMANCE_MONITORING', true),

        // Monitor slow queries
        'monitor_slow_queries' => env('MONITOR_SLOW_QUERIES', true),

        // Monitor slow API responses
        'monitor_slow_api' => env('MONITOR_SLOW_API', true),

        // Store metrics in
        'metrics_storage' => 'database', // or 'file', 'redis'

        // Metrics retention days
        'retention_days' => env('METRICS_RETENTION', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Feature Flags
    |--------------------------------------------------------------------------
    */
    'features' => [
        // Enable lazy loading
        'lazy_load_relations' => true,

        // Enable selective column queries
        'select_columns' => true,

        // Enable eager loading
        'eager_load_relations' => true,

        // Enable N+1 prevention
        'prevent_n_plus_1' => true,

        // Enable result caching
        'cache_results' => true,

        // Enable query indexing recommendations
        'suggest_indexes' => env('SUGGEST_INDEXES', false),
    ],
];
