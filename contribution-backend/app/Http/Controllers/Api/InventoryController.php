<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockItem;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * Get all stock items (CEO only)
     */
    public function index()
    {
        $items = StockItem::orderBy('name')->get();
        return response()->json($items);
    }

    /**
     * Create a new stock item (CEO only)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sku' => 'nullable|string|unique:stock_items,sku',
            'unit' => 'required|string|max:50',
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
            'reorder_level' => 'required|integer|min:0',
            'status' => 'required|in:active,inactive',
        ]);

        $item = StockItem::create($validated);

        // Record initial movement if quantity > 0
        if ($item->quantity > 0) {
            StockMovement::create([
                'stock_item_id' => $item->id,
                'movement_type' => 'in',
                'quantity' => $item->quantity,
                'reference_type' => 'initial_stock',
                'notes' => 'Initial stock creation',
                'created_by' => auth()->id(),
            ]);
        }

        return response()->json([
            'message' => 'Stock item created successfully',
            'item' => $item,
        ], 201);
    }

    /**
     * Get a single stock item
     */
    public function show($id)
    {
        $item = StockItem::with('movements.creator')->findOrFail($id);
        return response()->json($item);
    }

    /**
     * Update a stock item
     */
    public function update(Request $request, $id)
    {
        $item = StockItem::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'sku' => 'nullable|string|unique:stock_items,sku,' . $id,
            'unit' => 'sometimes|string|max:50',
            'unit_price' => 'sometimes|numeric|min:0',
            'reorder_level' => 'sometimes|integer|min:0',
            'status' => 'sometimes|in:active,inactive',
        ]);

        // Note: We don't update quantity directly here. Use recordMovement for that.
        $item->update($validated);

        return response()->json([
            'message' => 'Stock item updated successfully',
            'item' => $item,
        ]);
    }

    /**
     * Delete a stock item
     */
    public function destroy($id)
    {
        $item = StockItem::findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Stock item deleted successfully',
        ]);
    }

    /**
     * Record stock movement (in/out)
     */
    public function recordMovement(Request $request, $id)
    {
        $item = StockItem::findOrFail($id);

        $validated = $request->validate([
            'movement_type' => 'required|in:in,out,adjustment',
            'quantity' => 'required|integer|min:1',
            'reference_type' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($item, $validated) {
            $quantityChange = $validated['quantity'];

            if ($validated['movement_type'] === 'out') {
                if ($item->quantity < $quantityChange) {
                    abort(422, 'Insufficient stock');
                }
                $item->decrement('quantity', $quantityChange);
            } else {
                $item->increment('quantity', $quantityChange);
            }

            StockMovement::create([
                'stock_item_id' => $item->id,
                'movement_type' => $validated['movement_type'],
                'quantity' => $quantityChange,
                'reference_type' => $validated['reference_type'] ?? 'manual_adjustment',
                'notes' => $validated['notes'],
                'created_by' => auth()->id(),
            ]);
        });

        return response()->json([
            'message' => 'Stock movement recorded successfully',
            'item' => $item->fresh(),
        ]);
    }

    /**
     * Get low stock items
     */
    public function lowStock()
    {
        $items = StockItem::whereColumn('quantity', '<=', 'reorder_level')
            ->where('status', 'active')
            ->get();
            
        return response()->json($items);
    }
}
