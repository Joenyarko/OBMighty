<?php

namespace App\Console\Commands;

use App\Models\Card;
use Illuminate\Console\Command;

class FixCardAmounts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cards:fix-amounts {--dry-run : Show what would be changed without actually changing it}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix card amounts by recalculating based on assumed price per box';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        $this->info('Scanning cards for incorrect amounts...');
        $this->newLine();

        $cards = Card::all();
        $fixedCount = 0;

        foreach ($cards as $card) {
            // Calculate current box price
            $currentBoxPrice = $card->number_of_boxes > 0 
                ? $card->amount / $card->number_of_boxes 
                : 0;

            // If box price is less than 0.10, it's likely wrong
            // (assuming no card should have boxes cheaper than 10 pesewas)
            if ($currentBoxPrice < 0.10 && $currentBoxPrice > 0) {
                $this->warn("Found card with suspicious pricing:");
                $this->line("  Card: {$card->card_name} ({$card->card_code})");
                $this->line("  Current Amount: GHS {$card->amount}");
                $this->line("  Number of Boxes: {$card->number_of_boxes}");
                $this->line("  Current Box Price: GHS " . number_format($currentBoxPrice, 4));
                
                // Ask user for correct price per box
                $correctPrice = $this->ask("What should the price per box be for this card? (in GHS)");
                
                if ($correctPrice && is_numeric($correctPrice)) {
                    $newAmount = floatval($correctPrice) * $card->number_of_boxes;
                    
                    $this->info("  New Amount: GHS {$newAmount}");
                    $this->info("  New Box Price: GHS {$correctPrice}");
                    
                    if (!$dryRun) {
                        $card->amount = $newAmount;
                        $card->save();
                        $this->info("  ✓ Updated!");
                    } else {
                        $this->comment("  [DRY RUN] Would update to GHS {$newAmount}");
                    }
                    
                    $fixedCount++;
                } else {
                    $this->error("  ✗ Skipped (invalid input)");
                }
                
                $this->newLine();
            }
        }

        if ($fixedCount === 0) {
            $this->info('No cards needed fixing!');
        } else {
            $this->info("Fixed {$fixedCount} card(s)!");
        }

        return 0;
    }
}
