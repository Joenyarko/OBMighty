import { useState, useEffect } from 'react';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import api from '../services/api';
import '../styles/Cards.css';

const cardAPI = {
    getAll: () => api.get('/cards'),
    create: (data) => api.post('/cards', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id, data) => api.post(`/cards/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    delete: (id) => api.delete(`/cards/${id}`)
};

function Cards() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [formData, setFormData] = useState({
        card_name: '',
        number_of_boxes: '',
        amount: '',
        status: 'active'
    });
    const [frontImagePreview, setFrontImagePreview] = useState(null);
    const [backImagePreview, setBackImagePreview] = useState(null);
    const [frontImageFile, setFrontImageFile] = useState(null);
    const [backImageFile, setBackImageFile] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImage, setModalImage] = useState(null);

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            const response = await cardAPI.getAll();
            setCards(response.data);
        } catch (error) {
            showError('Failed to fetch cards');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                showError('Image size must be less than 5MB');
                return;
            }

            // Validate file type
            if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                showError('Only JPG, JPEG, and PNG images are allowed');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'front') {
                    setFrontImagePreview(reader.result);
                    setFrontImageFile(file);
                } else {
                    setBackImagePreview(reader.result);
                    setBackImageFile(file);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const resetForm = () => {
        setFormData({
            card_name: '',
            number_of_boxes: '',
            amount: '',
            status: 'active'
        });
        setFrontImagePreview(null);
        setBackImagePreview(null);
        setFrontImageFile(null);
        setBackImageFile(null);
        setEditMode(false);
        setSelectedCard(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!editMode && !frontImageFile) {
            showError('Please upload a front image');
            return;
        }

        // Calculate total amount (card_price × number_of_boxes)
        const cardPrice = parseFloat(formData.amount);
        const numberOfBoxes = parseInt(formData.number_of_boxes);
        const totalAmount = cardPrice * numberOfBoxes;

        const data = new FormData();
        data.append('card_name', formData.card_name);
        data.append('number_of_boxes', formData.number_of_boxes);
        data.append('amount', totalAmount); // Send total, not per-box price
        data.append('status', formData.status);

        if (frontImageFile) {
            data.append('front_image', frontImageFile);
        }
        if (backImageFile) {
            data.append('back_image', backImageFile);
        }

        try {
            if (editMode) {
                data.append('_method', 'PUT');
                await cardAPI.update(selectedCard.id, data);
                showSuccess('Card updated successfully!');
            } else {
                await cardAPI.create(data);
                showSuccess('Card created successfully!');
            }
            setShowModal(false);
            resetForm();
            fetchCards();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to save card');
        }
    };

    const handleEdit = (card) => {
        setSelectedCard(card);
        // Reverse-calculate the per-box price from total amount
        const perBoxPrice = card.number_of_boxes > 0
            ? (parseFloat(card.amount) / parseInt(card.number_of_boxes)).toFixed(2)
            : card.amount;

        setFormData({
            card_name: card.card_name,
            number_of_boxes: card.number_of_boxes,
            amount: perBoxPrice, // Show per-box price, not total
            status: card.status
        });
        setFrontImagePreview(card.front_image_url);
        setBackImagePreview(card.back_image_url);
        setEditMode(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const result = await showConfirm(
            'Are you sure you want to delete this card?',
            'This action cannot be undone!'
        );

        if (result.isConfirmed) {
            try {
                await cardAPI.delete(id);
                showSuccess('Card deleted successfully!');
                fetchCards();
            } catch (error) {
                showError('Failed to delete card');
            }
        }
    };

    const openImageModal = (imageUrl) => {
        setModalImage(imageUrl);
        setShowImageModal(true);
    };

    if (loading) {
        return <div className="loading">Loading cards...</div>;
    }

    return (
        <div className="cards-page">
            <div className="page-header">
                <h1>💳 Card Management</h1>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    + Issue New Card
                </button>
            </div>

            {/* Cards Grid */}
            <div className="cards-grid">
                {cards.length === 0 ? (
                    <div className="no-data">
                        <p>No cards found. Create your first card!</p>
                    </div>
                ) : (
                    cards.map(card => (
                        <div key={card.id} className="card-item">
                            <div className="card-header">
                                <h3>{card.card_name}</h3>
                                <span className="card-code">{card.card_code}</span>
                            </div>

                            <div className="card-images">
                                <div className="image-container">
                                    <label>Front (Items)</label>
                                    <img
                                        src={card.front_image_url}
                                        alt="Card Front"
                                        onClick={() => openImageModal(card.front_image_url)}
                                    />
                                </div>
                                <div className="image-container">
                                    <label>Back (Boxes)</label>
                                    <img
                                        src={card.back_image_url}
                                        alt="Card Back"
                                        onClick={() => openImageModal(card.back_image_url)}
                                    />
                                </div>
                            </div>

                            <div className="card-details">
                                <div className="detail-row">
                                    <span className="label">Boxes:</span>
                                    <span className="value">{card.number_of_boxes}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Amount:</span>
                                    <span className="value amount">₵{parseFloat(card.amount).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="card-actions">
                                <button className="btn-edit" onClick={() => handleEdit(card)}>
                                    Edit
                                </button>
                                <button className="btn-delete" onClick={() => handleDelete(card.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Card Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="modal-content card-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{editMode ? 'Edit Card' : 'Issue New Card'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Card Name *</label>
                                <input
                                    type="text"
                                    name="card_name"
                                    value={formData.card_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Premium Card"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Number of Boxes *</label>
                                    <input
                                        type="number"
                                        name="number_of_boxes"
                                        value={formData.number_of_boxes}
                                        onChange={handleInputChange}
                                        min="1"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Price Per Box (₵) *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="e.g., 2.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Front Image (Items) {!editMode && '*'}</label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        onChange={(e) => handleImageChange(e, 'front')}
                                        required={!editMode}
                                    />
                                    {frontImagePreview && (
                                        <div className="image-preview">
                                            <img src={frontImagePreview} alt="Front Preview" />
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Back Image (Boxes)</label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        onChange={(e) => handleImageChange(e, 'back')}
                                    />
                                    {backImagePreview && (
                                        <div className="image-preview">
                                            <img src={backImagePreview} alt="Back Preview" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {editMode && (
                                <div className="form-group">
                                    <label>Card Code (Auto-generated)</label>
                                    <input
                                        type="text"
                                        value={selectedCard?.card_code || ''}
                                        disabled
                                        className="readonly-input"
                                    />
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editMode ? 'Update Card' : 'Save Card'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Zoom Modal */}
            {showImageModal && (
                <div className="modal-overlay image-zoom-modal" onClick={() => setShowImageModal(false)}>
                    <div className="image-zoom-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowImageModal(false)}>×</button>
                        <img src={modalImage} alt="Card Image" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cards;
