import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showTextareaPrompt } from '../utils/sweetalert';
import '../styles/Surplus.css';

// API service for surplus
const surplusAPI = {
    getAll: async (status = null) => {
        const token = localStorage.getItem('token');
        const url = status
            ? `${import.meta.env.VITE_API_URL}/surplus?status=${status}`
            : `${import.meta.env.VITE_API_URL}/surplus`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch surplus entries');
        return response.json();
    },

    create: async (data) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/surplus`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create surplus entry');
        }
        return response.json();
    },

    withdraw: async (id, notes) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/surplus/${id}/withdraw`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ notes }),
        });
        if (!response.ok) throw new Error('Failed to withdraw surplus');
        return response.json();
    },

    allocate: async (id, customerCardId, notes) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/surplus/${id}/allocate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ customer_card_id: customerCardId, notes }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to allocate surplus');
        }
        return response.json();
    }
};

const usersAPI = {
    getAll: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    }
};

function Surplus() {
    const [entries, setEntries] = useState([]);
    const [totals, setTotals] = useState({ total_available: 0, total_allocated: 0, total_withdrawn: 0 });
    const [showAddForm, setShowAddForm] = useState(false);
    const [allocatingEntry, setAllocatingEntry] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchEntries();
        if (user?.role === 'ceo') {
            fetchWorkers();
        }
    }, [statusFilter, user]);

    const fetchWorkers = async () => {
        try {
            const data = await usersAPI.getAll();
            // Filter strictly to roles that generate surplus
            setWorkers(data.filter(u => ['worker', 'manager', 'secretary'].includes(u.role)));
        } catch (error) {
            console.error('Failed to load workers for surplus entry', error);
        }
    };

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const data = await surplusAPI.getAll(statusFilter === 'all' ? null : statusFilter);
            setEntries(data.entries?.data || []);
            setTotals(data.totals || { total_available: 0, total_allocated: 0, total_withdrawn: 0 });
        } catch (error) {
            console.error('Failed to fetch surplus entries:', error);
            showError(error.message || 'Failed to load surplus entries');
            setEntries([]);
            setTotals({ total_available: 0, total_allocated: 0, total_withdrawn: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async (formData) => {
        try {
            await surplusAPI.create(formData);
            fetchEntries();
            setShowAddForm(false);
            showSuccess('Surplus entry added successfully!');
        } catch (error) {
            console.error('Failed to add surplus entry:', error);
            showError(error.message || 'Failed to add surplus entry');
        }
    };

    const handleAllocate = async (surplusId, customerCardId) => {
        try {
            await surplusAPI.allocate(surplusId, customerCardId, 'Allocated via CEO Dashboard');
            fetchEntries();
            setAllocatingEntry(null);
            showSuccess('Surplus allocated successfully! Boxes have been updated.');
        } catch (error) {
            console.error('Failed to allocate surplus:', error);
            showError(error.message || 'Failed to allocate surplus');
        }
    };

    const handleWithdraw = async (entryId) => {
        const result = await showTextareaPrompt('Enter withdrawal notes:', 'Withdraw Surplus', 'Enter reason for withdrawal...');
        if (!result.isConfirmed || !result.value) return;

        try {
            await surplusAPI.withdraw(entryId, result.value);
            fetchEntries();
            showSuccess('Surplus withdrawn successfully!');
        } catch (error) {
            console.error('Failed to withdraw surplus:', error);
            showError('Failed to withdraw surplus');
        }
    };

    if (loading) {
        return <div className="loading">Loading surplus data...</div>;
    }

    return (
        <div className="surplus-page">
            <div className="page-header">
                <h1>Surplus Account</h1>
                {user?.role === 'ceo' && (
                    <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                        + Add Surplus Entry
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="surplus-summary">
                <div className="summary-card available">
                    <div className="card-icon">💵</div>
                    <div className="card-content">
                        <h3>Available</h3>
                        <p className="card-value">GHS{(parseFloat(totals?.total_available) || 0).toFixed(2)}</p>
                    </div>
                </div>
                <div className="summary-card allocated">
                    <div className="card-icon">🔗</div>
                    <div className="card-content">
                        <h3>Allocated</h3>
                        <p className="card-value">GHS{(parseFloat(totals?.total_allocated) || 0).toFixed(2)}</p>
                    </div>
                </div>
                <div className="summary-card withdrawn">
                    <div className="card-icon">💸</div>
                    <div className="card-content">
                        <h3>Withdrawn</h3>
                        <p className="card-value">GHS{(parseFloat(totals?.total_withdrawn) || 0).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={statusFilter === 'all' ? 'active' : ''}
                    onClick={() => setStatusFilter('all')}
                >
                    All
                </button>
                <button
                    className={statusFilter === 'available' ? 'active' : ''}
                    onClick={() => setStatusFilter('available')}
                >
                    Available
                </button>
                <button
                    className={statusFilter === 'allocated' ? 'active' : ''}
                    onClick={() => setStatusFilter('allocated')}
                >
                    Allocated
                </button>
                <button
                    className={statusFilter === 'withdrawn' ? 'active' : ''}
                    onClick={() => setStatusFilter('withdrawn')}
                >
                    Withdrawn
                </button>
            </div>

            {/* Entries Table */}
            <div className="table-container surplus-table">
                {entries.length === 0 ? (
                    <p className="no-data">No surplus entries found.</p>
                ) : (
                    <table className="mobile-card-view">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Branch</th>
                                <th>Worker</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Created By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td data-label="Date">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                    <td data-label="Branch">{entry.branch?.name || 'N/A'}</td>
                                    <td data-label="Worker">{entry.worker?.name || 'N/A'}</td>
                                    <td data-label="Amount" className="amount">GHS{parseFloat(entry.amount).toFixed(2)}</td>
                                    <td data-label="Description">{entry.description}</td>
                                    <td data-label="Status">
                                        <span className={`status-badge ${entry.status}`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                    <td data-label="Created By">{entry.creator?.name || 'N/A'}</td>
                                    <td data-label="Actions">
                                        {entry.status === 'available' && user.role === 'ceo' && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn-small btn-success"
                                                    onClick={() => setAllocatingEntry(entry)}
                                                >
                                                    Allocate
                                                </button>
                                                <button
                                                    className="btn-small btn-danger"
                                                    onClick={() => handleWithdraw(entry.id)}
                                                >
                                                    Withdraw
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Entry Modal */}
            {showAddForm && (
                <AddSurplusModal
                    onClose={() => setShowAddForm(false)}
                    onSubmit={handleAddEntry}
                    workers={workers}
                />
            )}

            {/* Allocate Entry Modal */}
            {allocatingEntry && (
                <AllocateSurplusModal
                    entry={allocatingEntry}
                    workers={workers}
                    onClose={() => setAllocatingEntry(null)}
                    onSubmit={(cardId) => handleAllocate(allocatingEntry.id, cardId)}
                />
            )}
        </div>
    );
}

function AllocateSurplusModal({ onClose, onSubmit, workers, entry }) {
    const [selectedWorkerId, setSelectedWorkerId] = useState(entry.worker_id || '');
    const [customers, setCustomers] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState('');
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    useEffect(() => {
        if (selectedWorkerId) {
            fetchCustomers(selectedWorkerId);
        } else {
            setCustomers([]);
        }
    }, [selectedWorkerId]);

    const fetchCustomers = async (workerId) => {
        setLoadingCustomers(true);
        try {
            const token = localStorage.getItem('token');
            // Fetch customers assigned to this worker to find their active cards
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers?worker_id=${workerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            // In a real system you'd want to fetch active cards or rely on the customer object returning them.
            // Our standard pattern in other components evaluates customer.active_card 
            const customersWithCards = (data.data || []).filter(c => c.active_card);
            setCustomers(customersWithCards);
        } catch (error) {
            console.error('Failed to load customers', error);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedCardId) {
            showError('Please select a customer card.');
            return;
        }
        onSubmit(selectedCardId);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Allocate Surplus</h2>
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                    <strong>Allocating: </strong> GHS {parseFloat(entry.amount).toFixed(2)} <br />
                    <small>Generated by: {entry.worker?.name || 'Unknown'}</small>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>1. Select Worker (Filter) *</label>
                        <select
                            value={selectedWorkerId}
                            onChange={(e) => {
                                setSelectedWorkerId(e.target.value);
                                setSelectedCardId('');
                            }}
                            required
                        >
                            <option value="">Select a worker...</option>
                            {workers.map((w) => (
                                <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>2. Select Customer Card *</label>
                        <select
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                            required
                            disabled={!selectedWorkerId || loadingCustomers}
                        >
                            <option value="">
                                {loadingCustomers ? 'Loading customers...' : 'Select a customer...'}
                            </option>
                            {customers.map((c) => {
                                const boxPrice = c.active_card.box_price || 0;
                                const maxBoxes = Math.floor(entry.amount / boxPrice);
                                return (
                                    <option key={c.active_card.id} value={c.active_card.id}>
                                        {c.name} - {c.active_card.card_name} (Price: GHS {boxPrice}, Translates to ~{maxBoxes} boxes)
                                    </option>
                                );
                            })}
                        </select>
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                            Only customers with active cards assigned to this worker are shown.
                        </small>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-success">
                            Confirm Allocation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddSurplusModal({ onClose, onSubmit, workers }) {
    const [formData, setFormData] = useState({
        worker_id: '',
        amount: '',
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        notes: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Add Surplus Entry</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Worker *</label>
                        <select
                            value={formData.worker_id}
                            onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                            required
                        >
                            <option value="">Select a worker...</option>
                            {workers.map((w) => (
                                <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Amount *</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                            placeholder="Enter amount"
                        />
                    </div>

                    <div className="form-group">
                        <label>Date *</label>
                        <input
                            type="date"
                            value={formData.entry_date}
                            onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            placeholder="Describe the source or reason for this surplus"
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label>Notes (Optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes..."
                            rows="2"
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Add Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Surplus;
