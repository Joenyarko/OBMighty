<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Customer;
use App\Models\CustomerCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CardSummaryController extends Controller
{
    /**
     * Get all cards with customer counts (role-scoped)
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Get all active cards
        $cards = Card::active()->orderBy('card_name')->get();

        // Build summary for each card
        $summary = $cards->map(function ($card) use ($user) {
            $query = Customer::where('card_id', $card->id)
                ->where('status', '!=', 'inactive');

            // Workers only see their own customers
            if ($user->hasRole('worker')) {
                $query->where('worker_id', $user->id);
            } elseif ($user->hasRole('secretary')) {
                $query->where('branch_id', $user->branch_id);
            }
            // CEO/super_admin sees all

            $totalCustomers = (clone $query)->count();
            $inProgress = (clone $query)->where('status', 'in_progress')->count();
            $completed = (clone $query)->where('status', 'completed')->count();
            $totalRevenue = (clone $query)->sum('amount_paid');

            return [
                'id' => $card->id,
                'card_name' => $card->card_name,
                'card_code' => $card->card_code,
                'number_of_boxes' => $card->number_of_boxes,
                'amount' => $card->amount,
                'front_image_url' => $card->front_image_url,
                'back_image_url' => $card->back_image_url,
                'total_customers' => $totalCustomers,
                'in_progress' => $inProgress,
                'completed' => $completed,
                'total_revenue' => round($totalRevenue, 2),
            ];
        });

        return response()->json([
            'cards' => $summary,
            'total_cards' => $cards->count(),
        ]);
    }

    /**
     * Get detailed card info with worker/customer breakdown
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $card = Card::findOrFail($id);
        $perPage = min((int) $request->get('per_page', 50), 100);

        // Base query for customers with this card
        $baseQuery = Customer::where('card_id', $card->id)
            ->where('status', '!=', 'inactive');

        // For CEO: group by worker with customer counts
        if ($user->hasRole('ceo') || $user->hasRole('super_admin')) {
            // Worker breakdown
            $workerBreakdown = Customer::where('card_id', $card->id)
                ->where('status', '!=', 'inactive')
                ->select(
                    'worker_id',
                    DB::raw('COUNT(*) as total_customers'),
                    DB::raw("SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress"),
                    DB::raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
                    DB::raw('SUM(amount_paid) as total_collected')
                )
                ->groupBy('worker_id')
                ->with('worker:id,name')
                ->get()
                ->map(function ($item) {
                    return [
                        'worker_id' => $item->worker_id,
                        'worker_name' => $item->worker->name ?? 'Unknown',
                        'total_customers' => $item->total_customers,
                        'in_progress' => $item->in_progress,
                        'completed' => $item->completed,
                        'total_collected' => round($item->total_collected, 2),
                    ];
                });

            // Paginated customer list for CEO (all customers)
            $customers = $baseQuery
                ->with(['worker:id,name', 'branch:id,name'])
                ->select('id', 'name', 'phone', 'location', 'worker_id', 'branch_id', 'status', 'boxes_filled', 'total_boxes', 'amount_paid', 'total_amount')
                ->orderBy('name')
                ->paginate($perPage);

            return response()->json([
                'card' => [
                    'id' => $card->id,
                    'card_name' => $card->card_name,
                    'card_code' => $card->card_code,
                    'number_of_boxes' => $card->number_of_boxes,
                    'amount' => $card->amount,
                    'front_image_url' => $card->front_image_url,
                ],
                'worker_breakdown' => $workerBreakdown,
                'customers' => $customers,
            ]);
        }

        // For Worker: only their customers
        if ($user->hasRole('worker')) {
            $baseQuery->where('worker_id', $user->id);
        } elseif ($user->hasRole('secretary')) {
            $baseQuery->where('branch_id', $user->branch_id);
        }

        $customers = $baseQuery
            ->select('id', 'name', 'phone', 'location', 'status', 'boxes_filled', 'total_boxes', 'amount_paid', 'total_amount')
            ->orderBy('name')
            ->paginate($perPage);

        return response()->json([
            'card' => [
                'id' => $card->id,
                'card_name' => $card->card_name,
                'card_code' => $card->card_code,
                'number_of_boxes' => $card->number_of_boxes,
                'amount' => $card->amount,
                'front_image_url' => $card->front_image_url,
            ],
            'customers' => $customers,
        ]);
    }

    /**
     * Scope helper: the Customer model already uses a 'worker' relationship
     * but we need a temporary relationship for the GROUP BY query.
     */
}
