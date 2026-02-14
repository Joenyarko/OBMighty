<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageUploadService
{
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const BASE_PATH = 'public/images'; // Base storage path

    /**
     * Upload an image file
     * @param UploadedFile $file
     * @param string $folder Subfolder within images (e.g., 'logos', 'cards', 'products')
     * @param string|null $namePrefix Optional prefix for the filename
     * @return array ['url' => '...', 'path' => '...', 'filename' => '...']
     * @throws \Exception
     */
    public function upload(UploadedFile $file, string $folder = 'general', ?string $namePrefix = null): array
    {
        // Validate file type
        if (!in_array($file->getMimeType(), self::ALLOWED_TYPES)) {
            throw new \Exception('Invalid file type. Allowed: PNG, JPEG, SVG, WebP');
        }

        // Validate file size
        if ($file->getSize() > self::MAX_SIZE) {
            throw new \Exception('File size exceeds 5MB limit');
        }

        // Generate filename
        $extension = $file->getClientOriginalExtension();
        $filename = $this->generateFilename($folder, $namePrefix, $extension);

        // Store file
        $storagePath = $folder;
        $path = $file->storeAs(
            self::BASE_PATH . '/' . $storagePath,
            $filename
        );

        if (!$path) {
            throw new \Exception('Failed to store file');
        }

        // Generate accessible URL
        $url = $this->generateUrl($folder, $filename);

        return [
            'url' => $url,
            'path' => $path,
            'filename' => $filename,
            'full_path' => storage_path('app/' . $path),
        ];
    }

    /**
     * Generate a unique filename
     */
    private function generateFilename(string $folder, ?string $prefix, string $extension): string
    {
        $timestamp = time();
        $random = Str::random(8);
        
        if ($prefix) {
            return "{$prefix}_{$timestamp}_{$random}.{$extension}";
        }
        
        return "{$folder}_{$timestamp}_{$random}.{$extension}";
    }

    /**
     * Generate a CORS-accessible URL for the image
     */
    private function generateUrl(string $folder, string $filename): string
    {
        // Return the API endpoint URL that handles CORS
        return url("/api/images/{$folder}/{$filename}");
    }

    /**
     * Delete an image file
     */
    public function delete(string $folder, string $filename): bool
    {
        $path = self::BASE_PATH . '/' . $folder . '/' . $filename;
        
        if (Storage::exists($path)) {
            return Storage::delete($path);
        }
        
        return false;
    }

    /**
     * Get file from storage and return for download
     */
    public function getFile(string $folder, string $filename)
    {
        $path = self::BASE_PATH . '/' . $folder . '/' . $filename;
        
        if (!Storage::exists($path)) {
            throw new \Exception('File not found');
        }
        
        return Storage::get($path);
    }

    /**
     * Extract folder and filename from URL
     */
    public static function extractFromUrl(string $url): ?array
    {
        // URL format: /api/images/{folder}/{filename}
        if (preg_match('#/api/images/([^/]+)/(.+)$#', $url, $matches)) {
            return [
                'folder' => $matches[1],
                'filename' => $matches[2],
            ];
        }
        
        return null;
    }
}
