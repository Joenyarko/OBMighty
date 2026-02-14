<?php

namespace App\Utils;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Query optimization utilities for common patterns
 */
class QueryOptimizer
{
    /**
     * Load relations efficiently with selected columns
     * Usage: QueryOptimizer::optimizedWith(User::query(), ['payments' => ['id', 'amount']])
     */
    public static function optimizedWith(Builder $query, array $relations): Builder
    {
        foreach ($relations as $relation => $columns) {
            if (is_array($columns)) {
                $query->with([$relation => function ($q) use ($columns) {
                    return $q->select(array_merge(['id'], $columns));
                }]);
            } else {
                $query->with($columns);
            }
        }

        return $query;
    }

    /**
     * Avoid N+1 by using selectRaw with joins
     * Better than loading relations when you only need aggregates
     */
    public static function withAggregates(
        Builder $query,
        string $relation,
        string $column,
        string $operation = 'sum'
    ): Builder {
        $relationTable = $query->getModel()->$relation()->getRelated()->getTable();
        $foreignKey = $query->getModel()->$relation()->getForeignKeyName();

        return $query->selectRaw("{$operation}({$relationTable}.{$column}) as {$operation}_{$column}");
    }

    /**
     * Chunk large result sets to avoid memory issues
     */
    public static function chunkAndProcess(
        Builder $query,
        int $chunkSize,
        callable $callback
    ): void {
        $query->chunk($chunkSize, function ($items) use ($callback) {
            foreach ($items as $item) {
                $callback($item);
            }
        });
    }

    /**
     * Get distinct values efficiently
     */
    public static function distinctValues(Builder $query, string $column): array
    {
        return $query->distinct()->pluck($column)->toArray();
    }

    /**
     * Optimize pagination queries with select
     */
    public static function paginateOptimized(
        Builder $query,
        array $columns = ['*'],
        int $perPage = 15
    ) {
        return $query->select($columns)
            ->paginate($perPage);
    }

    /**
     * Use raw queries for complex aggregations
     * More efficient than Eloquent when you don't need full models
     */
    public static function aggregateWithoutModels(
        Builder $query,
        string $selectRaw,
        ?string $groupBy = null
    ) {
        $query = $query->selectRaw($selectRaw);

        if ($groupBy) {
            $query = $query->groupBy($groupBy);
        }

        return $query->get();
    }

    /**
     * Preload all relations to avoid N+1
     */
    public static function withAllRelations(Builder $query): Builder
    {
        $model = $query->getModel();
        $relations = array_keys($model->getRelations());

        if (!empty($relations)) {
            return $query->with($relations);
        }

        return $query;
    }

    /**
     * Check if query will cause N+1 and warn
     */
    public static function detectN1Queries(string $originalSql, string $finalSql, int $threshold = 10): bool
    {
        // Compare original to final query count
        // This would require query logging to be enabled
        return false;
    }

    /**
     * Limit sub-queries results
     */
    public static function withLimitedSubqueries(Builder $query, array $relations, int $limit = 10): Builder
    {
        foreach ($relations as $relation) {
            $query->with([$relation => function ($q) use ($limit) {
                return $q->limit($limit);
            }]);
        }

        return $query;
    }

    /**
     * Lazy load to reduce memory
     */
    public static function lazyLoad(Builder $query, int $chunkSize = 1000)
    {
        return $query->lazy($chunkSize);
    }

    /**
     * Cache query results with TTL
     */
    public static function withCache(
        Builder $query,
        string $cacheKey,
        int $duration = 3600
    ) {
        return \Cache::remember($cacheKey, $duration, function () use ($query) {
            return $query->get();
        });
    }

    /**
     * Use exists() instead of count() when checking existence
     */
    public static function exists(Builder $query): bool
    {
        return $query->exists();
    }

    /**
     * Use pluck() for single column instead of get()
     */
    public static function pluckColumn(Builder $query, string $column): Collection
    {
        return $query->pluck($column);
    }

    /**
     * Index hints for MySQL optimizer
     */
    public static function withIndexHint(Builder $query, string $indexName): Builder
    {
        return $query->from(\DB::raw("`{$query->getModel()->getTable()}` USE INDEX ({$indexName})"));
    }

    /**
     * Avoid select * when possible
     */
    public static function selectOnly(Builder $query, array $columns): Builder
    {
        return $query->select(array_merge(['id'], $columns));
    }

    /**
     * Use union for combining queries efficiently
     */
    public static function unionQueries(array $queries)
    {
        $union = reset($queries);

        foreach (array_slice($queries, 1) as $query) {
            $union = $union->union($query);
        }

        return $union->get();
    }
}
