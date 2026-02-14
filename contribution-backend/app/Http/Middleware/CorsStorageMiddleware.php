<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsStorageMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Add CORS headers for storage access
        $response->header('Access-Control-Allow-Origin', '*');
        $response->header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        $response->header('Access-Control-Allow-Headers', 'Content-Type, Accept');
        $response->header('Access-Control-Max-Age', '3600');

        return $response;
    }
}
