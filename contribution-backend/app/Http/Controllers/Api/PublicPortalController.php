<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerCard;
use App\Models\BoxState;
use Illuminate\Http\Request;

class PublicPortalController extends Controller
{
    /**
     * Get read-only public passbook for a customer by share token
     */
    public function getPassbook($token)
    {
        $customer = Customer::withoutGlobalScope('company')
            ->where(function ($q) use ($token) {
                $q->where('share_token', $token)
                  ->orWhere('id', $token);
            })
            ->with(['company', 'branch', 'worker', 'card'])
            ->first();

        if (!$customer) {
            return response()->json([
                'message' => 'Passbook not found or invalid link.'
            ], 404);
        }

        // Active card or most recent card
        $customerCard = CustomerCard::withoutGlobalScope('company')
            ->where('customer_id', $customer->id)
            ->where('status', 'active')
            ->with('card')
            ->latest('id')
            ->first();

        if (!$customerCard) {
            $customerCard = CustomerCard::withoutGlobalScope('company')
                ->where('customer_id', $customer->id)
                ->with('card')
                ->latest('id')
                ->first();
        }

        $boxStates = [];
        $paymentHistory = [];

        if ($customerCard) {
            $boxStates = BoxState::where('customer_card_id', $customerCard->id)
                ->orderBy('box_number')
                ->get()
                ->map(function ($box) {
                    return [
                        'id' => $box->id,
                        'box_number' => $box->box_number,
                        'is_checked' => (bool)$box->is_checked,
                        'checked_date' => $box->checked_date ? $box->checked_date->toDateString() : null,
                        'payment_id' => $box->payment_id,
                        'is_penalty' => (bool)$box->is_penalty,
                    ];
                });

            $paymentHistory = $customerCard->boxPayments()
                ->with('worker:id,name')
                ->orderBy('payment_date', 'desc')
                ->orderBy('id', 'desc')
                ->get()
                ->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'payment_date' => $payment->payment_date ? $payment->payment_date->toDateString() : null,
                        'payment_time' => $payment->payment_time,
                        'amount_paid' => (float)$payment->amount_paid,
                        'boxes_checked' => (int)$payment->boxes_checked,
                        'payment_method' => $payment->payment_method ?? 'cash',
                        'worker_name' => $payment->worker ? $payment->worker->name : null,
                        'receipt_number' => $payment->receipt_number,
                        'notes' => $payment->notes,
                    ];
                });
        }

        $company = $customer->company;

        // Calculate start and due dates with card duration fallback
        $startDate = $customer->start_date ? $customer->start_date->toDateString() : ($customerCard?->assigned_date ? $customerCard->assigned_date->toDateString() : null);
        $dueDate = $customer->due_date ? $customer->due_date->toDateString() : null;
        if (!$dueDate && $startDate && $customerCard?->card?->duration_months) {
            $dueDate = \Carbon\Carbon::parse($startDate)->addMonths((int)$customerCard->card->duration_months)->toDateString();
        }

        return response()->json([
            'company' => [
                'name' => $company ? $company->name : config('app.company_name', 'Contribution Manager'),
                'logo_url' => $company ? $company->logo_url : null,
                'phone' => $company ? $company->phone : null,
                'email' => $company ? $company->email : null,
                'address' => $company ? $company->address : null,
                'primary_color' => $company ? $company->primary_color : '#fdbe12',
                'terms_and_conditions' => $company ? $company->terms_and_conditions : null,
            ],
            'customer' => [
                'name' => $customer->name,
                'phone' => $customer->phone,
                'location' => $customer->location,
                'branch_name' => $customer->branch ? $customer->branch->name : null,
                'worker_name' => $customer->worker ? $customer->worker->name : null,
                'start_date' => $startDate,
                'due_date' => $dueDate,
                'status' => $customer->status,
                'is_served' => (bool)$customer->is_served,
            ],
            'card' => $customerCard ? [
                'id' => $customerCard->id,
                'card_name' => $customerCard->card ? $customerCard->card->card_name : ($customer->card ? $customer->card->card_name : 'Savings Card'),
                'duration_months' => $customerCard->card ? $customerCard->card->duration_months : ($customer->card ? $customer->card->duration_months : null),
                'terms_and_conditions' => $customerCard->card?->terms_and_conditions ?: ($company?->terms_and_conditions ?: null),
                'card_terms' => $customerCard->card?->terms_and_conditions,
                'company_terms' => $company?->terms_and_conditions,
                'penalty_boxes' => (int)($customerCard->penalty_boxes ?? 0),
                'penalty_amount' => (float)($customerCard->penalty_amount ?? 0),
                'penalty_percentage' => $customerCard->penalty_percentage ? (float)$customerCard->penalty_percentage : null,
                'penalty_applied_at' => $customerCard->penalty_applied_at ? $customerCard->penalty_applied_at->toDateString() : null,
                'penalty_notes' => $customerCard->penalty_notes,
                'has_penalty' => (int)($customerCard->penalty_boxes ?? 0) > 0,
                'status' => $customerCard->status,
                'total_boxes' => (int)$customerCard->total_boxes,
                'boxes_checked' => (int)$customerCard->boxes_checked,
                'boxes_remaining' => (int)$customerCard->boxes_remaining,
                'box_price' => (float)$customerCard->box_price,
                'total_amount' => (float)$customerCard->total_amount,
                'amount_paid' => (float)$customerCard->amount_paid,
                'amount_remaining' => (float)$customerCard->amount_remaining,
                'completion_percentage' => (float)$customerCard->completion_percentage,
                'assigned_date' => $customerCard->assigned_date ? $customerCard->assigned_date->toDateString() : null,
            ] : null,
            'box_states' => $boxStates,
            'payments' => $paymentHistory,
        ]);
    }
}
