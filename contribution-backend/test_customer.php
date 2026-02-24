<?php
require __DIR__.'/vendor/autoload.php';
\ = require_once __DIR__.'/bootstrap/app.php';
\ = \->make(Illuminate\Contracts\Console\Kernel::class);
\->bootstrap();

\ = \App\Models\Customer::with('customerCard')->first();
echo json_encode(\->toArray(), JSON_PRETTY_PRINT);
