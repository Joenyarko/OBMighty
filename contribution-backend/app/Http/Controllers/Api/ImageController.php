<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ImageUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageController extends Controller
{
    protected $imageService;

    public function __construct(ImageUploadService $imageService)
    {
        $this->imageService = $imageService;
    }

    /**
     * Serve an image with CORS headers
     * GET /api/images/{folder}/{filename}
     */
    public function serve($folder, $filename)
    {
        try {
            // Prevent directory traversal attacks
            if (strpos($folder, '..') !== false || strpos($filename, '..') !== false) {
                return response()->json(['message' => 'Invalid path'], 400);
            }

            $content = $this->imageService->getFile($folder, $filename);
            
            // Determine MIME type
            $mimeType = $this->getMimeType($filename);
            
            return response($content)
                ->header('Content-Type', $mimeType)
                ->header('Cache-Control', 'public, max-age=86400')
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
                ->header('Access-Control-Max-Age', '3600');
        } catch (\Exception $e) {
            return response()->json(['message' => 'Image not found'], 404);
        }
    }

    /**
     * Upload an image
     * POST /api/images/upload
     */
    public function upload(Request $request)
    {
        $request->validate([
            'image' => 'required|file|image|mimes:png,jpg,jpeg,svg,webp|max:5120',
            'folder' => 'required|string|in:logos,cards,products,general',
            'prefix' => 'nullable|string|max:50',
        ]);

        try {
            $file = $request->file('image');
            $folder = $request->input('folder', 'general');
            $prefix = $request->input('prefix');

            $result = $this->imageService->upload($file, $folder, $prefix);

            // Log upload
            if (auth()->check()) {
                \App\Models\AuditLog::create([
                    'company_id' => auth()->user()->company_id,
                    'user_id' => auth()->user()->id,
                    'action' => "Image uploaded to {$folder}",
                    'details' => json_encode(['filename' => $result['filename']]),
                    'ip_address' => $request->ip(),
                ]);
            }

            return response()->json([
                'message' => 'Image uploaded successfully',
                'image' => [
                    'url' => $result['url'],
                    'filename' => $result['filename'],
                    'folder' => $folder,
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Upload failed',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Delete an image
     * DELETE /api/images/{folder}/{filename}
     */
    public function delete($folder, $filename)
    {
        // Only authenticated users can delete
        if (!auth()->check()) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $this->imageService->delete($folder, $filename);

            // Log deletion
            \App\Models\AuditLog::create([
                'company_id' => auth()->user()->company_id,
                'user_id' => auth()->user()->id,
                'action' => "Image deleted from {$folder}",
                'details' => json_encode(['filename' => $filename]),
                'ip_address' => request()->ip(),
            ]);

            return response()->json(['message' => 'Image deleted successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Delete failed',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Determine MIME type from filename
     */
    private function getMimeType(string $filename): string
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
        ];

        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }
}
