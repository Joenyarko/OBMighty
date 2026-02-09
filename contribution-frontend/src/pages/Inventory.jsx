import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { inventoryAPI } from '../services/api';
import { showSuccess, showError } from '../utils/sweetalert';
import Layout from '../components/Layout';
import '../styles/App.css';

function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('add'); // 'add', 'receive', 'adjust'
    const location = useLocation();

    const [formData, setFormData] = useState({
        name: '', unit: 'pcs', quantity: '', unit_price: '', reorder_level: '', status: 'active'
    });

    // Movement Form Data
    const [movementData, setMovementData] = useState({
        stock_item_id: '',
        quantity: '',
        movement_type: 'in', // 'in' or 'out' (damage/loss/adjustment)
        reference_type: 'purchase', // 'purchase', 'return', 'damage', 'correction'
        notes: ''
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    // Handle URL Query Params for Submenu Actions
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const action = params.get('action');
        if (action === 'receive') {
            setModalType('receive');
            setShowModal(true);
            setMovementData(prev => ({ ...prev, type: 'in', reason: 'purchase' }));
        } else if (action === 'adjust') {
            setModalType('adjust');
            setShowModal(true);
            setMovementData(prev => ({ ...prev, type: 'out', reason: 'correction' }));
        } else {
            setModalType('add');
            setShowModal(false);
        }
    }, [location.search]);

    const fetchInventory = async () => {
        try {
            const response = await inventoryAPI.getAll();
            setItems(response.data);
        } catch (error) {
            console.error('Failed to fetch inventory', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalType === 'add') {
                await inventoryAPI.create(formData);
                setFormData({ name: '', unit: 'pcs', quantity: '', unit_price: '', reorder_level: '', status: 'active' });
            } else {
                // Handle Movement (Receive/Adjust)
                await inventoryAPI.recordMovement(movementData.stock_item_id, movementData);
                setMovementData({ stock_item_id: '', quantity: '', movement_type: 'in', reference_type: 'purchase', notes: '' });
            }
            setShowModal(false);
            fetchInventory();
        } catch (error) {
            console.error('Failed to save', error);
            showError('Error saving data');
        }
    };

    const openAddModal = () => {
        setModalType('add');
        setShowModal(true);
    };

    const openAdjustModal = (item) => {
        setMovementData({
            stock_item_id: item.id,
            quantity: '',
            movement_type: 'out',
            reference_type: 'adjustment',
            notes: ''
        });
        setModalType('adjust');
        setShowModal(true);
    };

    return (
        <div className="inventory-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>Inventory Management</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => { setModalType('receive'); setShowModal(true); }}>
                        📥 Receive Stock
                    </button>
                    <button className="btn-primary" onClick={openAddModal}>
                        + Add New Item
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading stock...</div>
            ) : (
                <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Item Name</th>
                                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>SKU</th>
                                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Qty</th>
                                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Unit Price</th>
                                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Status</th>
                                    <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            No stock items found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '16px', fontWeight: '500' }}>{item.name}</td>
                                            <td style={{ padding: '16px', fontFamily: 'monospace' }}>{item.sku || '-'}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    color: item.quantity <= item.reorder_level ? 'var(--danger-color)' : 'var(--text-primary)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {item.quantity} {item.unit}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>₵{item.unit_price}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: item.status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                                                    color: item.status === 'active' ? '#4CAF50' : '#FF4444',
                                                    fontSize: '12px'
                                                }}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => openAdjustModal(item)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '4px 8px' }}
                                                >
                                                    🔄 Adjust
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>
                            {modalType === 'add' ? 'Add New Stock Item' : modalType === 'receive' ? 'Receive Stock' : 'Adjust Stock'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            {modalType === 'add' ? (
                                <>
                                    <div className="form-group">
                                        <label>Item Name</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group">
                                            <label>Quantity</label>
                                            <input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Unit</label>
                                            <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Unit Price (₵)</label>
                                        <input type="number" value={formData.unit_price} onChange={e => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Reorder Level</label>
                                        <input type="number" value={formData.reorder_level} onChange={e => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })} required />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Select Item</label>
                                        <select value={movementData.stock_item_id} onChange={e => setMovementData({ ...movementData, stock_item_id: e.target.value })} required>
                                            <option value="">Select Item...</option>
                                            {items.map(item => (
                                                <option key={item.id} value={item.id}>{item.name} (Qty: {item.quantity})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Quantity to {modalType === 'receive' ? 'Add' : 'Adjust'}</label>
                                        <input type="number" value={movementData.quantity} onChange={e => setMovementData({ ...movementData, quantity: parseInt(e.target.value) })} required />
                                    </div>
                                    {modalType === 'adjust' && (
                                        <div className="form-group">
                                            <label>Adjustment Type</label>
                                            <select value={movementData.movement_type} onChange={e => setMovementData({ ...movementData, movement_type: e.target.value })}>
                                                <option value="in">Add (+)</option>
                                                <option value="out">Remove (-)</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Reason</label>
                                        <select value={movementData.reference_type} onChange={e => setMovementData({ ...movementData, reference_type: e.target.value })}>
                                            <option value="purchase">New Purchase</option>
                                            <option value="return">Customer Return</option>
                                            <option value="damage">Damaged/Expired</option>
                                            <option value="adjustment">Inventory Correction</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                                    {modalType === 'add' ? 'Save Item' : 'Confirm Movement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
