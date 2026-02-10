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
};

function Surplus() {
    const [entries, setEntries] = useState([]);
    const [totals, setTotals] = useState({ total_available: 0, total_allocated: 0, total_withdrawn: 0 });
    const [showAddForm, setShowAddForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchEntries();
    }, [statusFilter]);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const data = await surplusAPI.getAll(statusFilter === 'all' ? null : statusFilter);
            setEntries(data.entries.data || []);
            setTotals(data.totals);
        } catch (error) {
            console.error('Failed to fetch surplus entries:', error);
            showError('Failed to load surplus entries');
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
                <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                    + Add Surplus Entry
                </button>
            </div>

            {/* Summary Cards */}
            <div className="surplus-summary">
                <div className="summary-card available">
                    <div className="card-icon">💵</div>
                    <div className="card-content">
                        <h3>Available</h3>
                        <p className="card-value">GHS{parseFloat(totals.total_available).toFixed(2)}</p>
                    </div>
                </div>
                <div className="summary-card allocated">
                    <div className="card-icon">🔗</div>
                    <div className="card-content">
                        <h3>Allocated</h3>
                        <p className="card-value">GHS{parseFloat(totals.total_allocated).toFixed(2)}</p>
                    </div>
                </div>
                <div className="summary-card withdrawn">
                    <div className="card-icon">💸</div>
                    <div className="card-content">
                        <h3>Withdrawn</h3>
                        <p className="card-value">GHS{parseFloat(totals.total_withdrawn).toFixed(2)}</p>
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
                                    <td data-label="Date">{entry.entry_date}</td>
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
                                            <button
                                                className="btn-small btn-danger"
                                                onClick={() => handleWithdraw(entry.id)}
                                            >
                                                Withdraw
                                            </button>
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
                    userBranchId={user.branch_id}
                />
            )}
        </div>
    );
}

function AddSurplusModal({ onClose, onSubmit, userBranchId }) {
    const [formData, setFormData] = useState({
        branch_id: userBranchId || '',
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
