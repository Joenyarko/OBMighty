<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CardController extends Controller
{
    /**
     * Get all cards
     */
    public function index()
    {
        $cards = Card::active()->orderBy('card_name')->paginate(10);
        return response()->json($cards);
    }

    /**
     * Create a new card with image uploads
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'card_name' => 'required|string|max:255',
            'number_of_boxes' => 'required|integer|min:1',
            'amount' => 'required|numeric|min:0',
            'front_image' => 'required|image|mimes:jpeg,jpg,png|max:5120', // 5MB max
            'back_image' => 'nullable|image|mimes:jpeg,jpg,png|max:5120',
            'status' => 'nullable|in:active,inactive',
        ]);

        // Handle front image upload
        if ($request->hasFile('front_image')) {
            $frontImage = $request->file('front_image');
            $frontImageName = 'card_front_' . time() . '_' . uniqid() . '.' . $frontImage->getClientOriginalExtension();
            $frontImagePath = $frontImage->storeAs('cards/front', $frontImageName, 'public');
            $validated['front_image'] = $frontImagePath;
        }

        // Handle back image upload
        if ($request->hasFile('back_image')) {
            $backImage = $request->file('back_image');
            $backImageName = 'card_back_' . time() . '_' . uniqid() . '.' . $backImage->getClientOriginalExtension();
            $backImagePath = $backImage->storeAs('cards/back', $backImageName, 'public');
            $validated['back_image'] = $backImagePath;
        }

        $validated['status'] = $validated['status'] ?? 'active';

        $card = Card::create($validated);

        return response()->json([
            'message' => 'Card created successfully',
            'card' => $card,
        ], 201);
    }

    /**
     * Get a single card
     */
    public function show($id)
    {
        $card = Card::findOrFail($id);
        return response()->json($card);
    }

    /**
     * Update a card with optional image replacements
     */
    public function update(Request $request, $id)
    {
        $card = Card::findOrFail($id);

        $validated = $request->validate([
            'card_name' => 'sometimes|string|max:255',
            'number_of_boxes' => 'sometimes|integer|min:1',
            'amount' => 'sometimes|numeric|min:0',
            'front_image' => 'nullable|image|mimes:jpeg,jpg,png|max:5120',
            'back_image' => 'nullable|image|mimes:jpeg,jpg,png|max:5120',
            'status' => 'sometimes|in:active,inactive',
        ]);

        // Handle front image replacement
        if ($request->hasFile('front_image')) {
            // Delete old front image
            if ($card->front_image) {
                Storage::disk('public')->delete($card->front_image);
            }

            $frontImage = $request->file('front_image');
            $frontImageName = 'card_front_' . time() . '_' . uniqid() . '.' . $frontImage->getClientOriginalExtension();
            $frontImagePath = $frontImage->storeAs('cards/front', $frontImageName, 'public');
            $validated['front_image'] = $frontImagePath;
        }

        // Handle back image replacement
        if ($request->hasFile('back_image')) {
            // Delete old back image
            if ($card->back_image) {
                Storage::disk('public')->delete($card->back_image);
            }

            $backImage = $request->file('back_image');
            $backImageName = 'card_back_' . time() . '_' . uniqid() . '.' . $backImage->getClientOriginalExtension();
            $backImagePath = $backImage->storeAs('cards/back', $backImageName, 'public');
            $validated['back_image'] = $backImagePath;
        }

        $card->update($validated);

        return response()->json([
            'message' => 'Card updated successfully',
            'card' => $card->fresh(),
        ]);
    }

    /**
     * Delete a card (images are auto-deleted via model event)
     */
    public function destroy($id)
    {
        $card = Card::findOrFail($id);
        $card->delete();

        return response()->json([
            'message' => 'Card deleted successfully',
        ]);
    }
}
