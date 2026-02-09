<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'O.B. Mighty Contribution Manager API',
        'version' => '1.0.0',
        'status' => 'active'
    ]);
});
