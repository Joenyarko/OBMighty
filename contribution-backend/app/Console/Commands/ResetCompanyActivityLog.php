<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Company;
use App\Models\AuditLog;

class ResetCompanyActivityLog extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'company:reset-activity-log {company_id? : The ID of the company}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clears all activity/audit log entries for a specific company.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $companyId = $this->argument('company_id');

        if (!$companyId) {
            $this->info('Available Companies:');
            foreach (Company::all() as $c) {
                $this->info("ID: {$c->id} | Name: {$c->name}");
            }
            $companyId = $this->ask('Please enter the ID of the company whose activity log you want to reset');
        }

        $company = Company::find($companyId);

        if (!$company) {
            $this->error("Company with ID {$companyId} not found.");
            return 1;
        }

        $count = AuditLog::where('company_id', $company->id)->count();

        $this->warn("WARNING: This will permanently delete {$count} activity log entries for '{$company->name}'.");

        if (!$this->confirm('Are you absolutely sure you want to proceed?')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        AuditLog::where('company_id', $company->id)->delete();

        $this->info("✓ Deleted {$count} activity log entries for {$company->name}.");
        return 0;
    }
}
