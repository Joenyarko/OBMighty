import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { showSuccess, showError } from '../utils/sweetalert';
import api from '../services/api';
import '../styles/ImageUpload.css';

/**
 * Reusable Image Upload Component
 * Can be used for logos, cards, products, or any image
 */
function ImageUpload({ 
    onImageUpload, 
    currentImage = null, 
    folder = 'general',
    label = 'Upload Image',
    accept = 'image/png,image/jpeg,image/svg+xml,image/webp',
    maxSize = 5,
    showLabel = true,
    compact = false
}) {
    const [previewImage, setPreviewImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const validateImage = (file) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
        
        if (!allowedTypes.includes(file.type)) {
            showError('Please upload a valid image file (PNG, JPEG, SVG, or WebP)');
            return false;
        }

        if (file.size > maxSize * 1024 * 1024) {
            showError(`File size must be less than ${maxSize}MB`);
            return false;
        }

        return true;
    };

    const processImageFile = (file) => {
        if (!validateImage(file)) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };

    const confirmUpload = async () => {
        if (!previewImage) return;

        try {
            setUploading(true);

            // Convert data URL back to file
            const response = await fetch(previewImage);
            const blob = await response.blob();
            const file = new File([blob], 'image', { type: blob.type });

            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', folder);

            const uploadResponse = await api.post('/images/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const imageUrl = uploadResponse.data.image.url;
            setPreviewImage(null);
            
            // Call parent callback
            if (onImageUpload) {
                onImageUpload(imageUrl, uploadResponse.data.image);
            }

            showSuccess('Image uploaded successfully');
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const cancelPreview = () => {
        setPreviewImage(null);
    };

    const containerClass = compact ? 'image-upload-compact' : 'image-upload-full';

    return (
        <div className={`image-upload-container ${containerClass}`}>
            {/* Preview Modal */}
            {previewImage && (
                <div className="image-preview-modal">
                    <div className="preview-content">
                        <h3>Preview Image</h3>
                        <img src={previewImage} alt="Preview" className="preview-img" />
                        <p className="preview-text">Does this look good?</p>
                        <div className="preview-actions">
                            <button
                                className="btn-success"
                                onClick={confirmUpload}
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Confirm Upload'}
                            </button>
                            <button
                                className="btn-cancel"
                                onClick={cancelPreview}
                                disabled={uploading}
                            >
                                Change
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Area */}
            {!currentImage || previewImage ? (
                <div
                    className={`image-dropzone ${dragActive ? 'active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        id={`image-upload-${folder}`}
                        accept={accept}
                        onChange={handleFileInput}
                        disabled={uploading || previewImage}
                        style={{ display: 'none' }}
                    />

                    <div className="dropzone-content">
                        <Upload size={compact ? 24 : 32} className="upload-icon" />
                        <h4>{compact ? 'Drop or click' : label}</h4>
                        {!compact && <p>PNG, JPEG, SVG, or WebP (max {maxSize}MB)</p>}
                        <button
                            type="button"
                            className={compact ? 'btn-sm' : 'btn-primary'}
                            onClick={() => document.getElementById(`image-upload-${folder}`).click()}
                            disabled={uploading || previewImage}
                        >
                            {compact ? 'Browse' : 'Choose File'}
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Current Image Display */}
            {currentImage && !previewImage && (
                <div className="image-current">
                    <div className="image-display">
                        <img src={currentImage} alt="Current" />
                    </div>
                    {showLabel && <p className="image-label">Current Image</p>}
                    <button
                        type="button"
                        className="btn-link-secondary"
                        onClick={() => document.getElementById(`image-upload-${folder}`).click()}
                    >
                        Change Image
                    </button>
                </div>
            )}
        </div>
    );
}

export default ImageUpload;
