<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class CacheService
{
    /**
     * Cache durations for different types of data
     */
    public const DURATION_DASHBOARD = 300; // 5 minutes
    public const DURATION_REPORTS = 3600; // 1 hour
    public const DURATION_STATS = 600; // 10 minutes
    public const DURATION_INVENTORY = 300; // 5 minutes
    public const DURATION_USER_DATA = 1800; // 30 minutes

    /**
     * Clear all cache for a company
     */
    public static function clearCompanyCache($companyId): void
    {
        $patterns = [
            "dashboard:{$companyId}*",
            "payment_stats:{$companyId}*",
            "profitability:{$companyId}*",
            "customer_perf:{$companyId}*",
            "worker_prod:{$companyId}*",
            "inventory:{$companyId}",
            "ledger:{$companyId}*",
        ];

        foreach ($patterns as $pattern) {
            Cache::forget($pattern);
        }
    }

    /**
     * Clear dashboard cache for a company
     */
    public static function clearDashboardCache($companyId): void
    {
        Cache::forget("dashboard:{$companyId}");
    }

    /**
     * Clear report caches for a company
     */
    public static function clearReportCache($companyId, $reportType = null): void
    {
        if ($reportType) {
            Cache::forget("{$reportType}:{$companyId}*");
        } else {
            Cache::forget("profitability:{$companyId}*");
            Cache::forget("customer_perf:{$companyId}*");
            Cache::forget("worker_prod:{$companyId}*");
            Cache::forget("ledger:{$companyId}*");
        }
    }

    /**
     * Clear inventory cache for a company
     */
    public static function clearInventoryCache($companyId): void
    {
        Cache::forget("inventory:{$companyId}");
    }

    /**
     * Clear payment stats cache
     */
    public static function clearPaymentStatsCache($companyId, $userId = null): void
    {
        if ($userId) {
            Cache::forget("payment_stats:{$companyId}:{$userId}");
        } else {
            Cache::forget("payment_stats:{$companyId}*");
        }
    }

    /**
     * Remember data with automatic cache busting
     */
    public static function rememberWithTTL(
        string $key,
        int $duration,
        callable $callback
    ) {
        return Cache::remember($key, $duration, $callback);
    }

    /**
     * Get or forget cached key
     */
    public static function getOrForget(string $key)
    {
        return Cache::get($key);
    }

    /**
     * Put value in cache with TTL
     */
    public static function put(string $key, $value, int $duration): void
    {
        Cache::put($key, $value, $duration);
    }

    /**
     * Get cache hit rate for monitoring
     */
    public static function getMetrics(): array
    {
        // This would be implemented based on your cache driver
        return [
            'hit_rate' => 0,
            'miss_rate' => 0,
            'stored_keys' => 0,
        ];
    }

    /**
     * Flush all caches
     */
    public static function flushAll(): void
    {
        Cache::flush();
    }

    /**
     * Generate cache key with date sensitivity
     */
    public static function generateDateSensitiveKey(string $base, Carbon $date): string
    {
        return "{$base}:{$date->toDateString()}";
    }

    /**
     * Generate cache key with range sensitivity
     */
    public static function generateRangeSensitiveKey(
        string $base,
        Carbon $startDate,
        Carbon $endDate
    ): string {
        return "{$base}:{$startDate->toDateString()}:{$endDate->toDateString()}";
    }

    /**
     * Check if cache key exists
     */
    public static function has(string $key): bool
    {
        return Cache::has($key);
    }

    /**
     * Increment cache value
     */
    public static function increment(string $key, $value = 1): int
    {
        return Cache::increment($key, $value);
    }

    /**
     * Decrement cache value
     */
    public static function decrement(string $key, $value = 1): int
    {
        return Cache::decrement($key, $value);
    }

    /**
     * Store temporary cache for user request
     */
    public static function storeTemporary(string $key, $value, int $seconds = 300): void
    {
        Cache::put($key, $value, now()->addSeconds($seconds));
    }
}
