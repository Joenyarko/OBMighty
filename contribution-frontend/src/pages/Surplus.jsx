import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showTextareaPrompt } from '../utils/sweetalert';
import Swal from 'sweetalert2';
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

    withdraw: async (workerId, amount, notes) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/surplus/withdraw`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ worker_id: workerId, amount, notes }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to withdraw surplus');
        }
        return response.json();
    },

    allocate: async (workerId, customerCardId, amount, notes) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/surplus/allocate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ worker_id: workerId, customer_card_id: customerCardId, amount, notes }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to allocate surplus');
        }
        return response.json();
    },

    adjust: async (workerId, amount, notes) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/surplus/adjust`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ worker_id: workerId, amount, notes }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to adjust surplus balance');
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
    const [workerBalances, setWorkerBalances] = useState([]);
    const [totals, setTotals] = useState({ total_available: 0, total_allocated: 0, total_withdrawn: 0 });
    const [showAddForm, setShowAddForm] = useState(false);
    const [allocatingWorker, setAllocatingWorker] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all'); // Kept for future raw entries tab but hidden for now
    const [loading, setLoading] = useState(true);
    const { user, isCEO } = useAuth();

    useEffect(() => {
        fetchEntries();
        if (isCEO) {
            fetchWorkers();
        }
    }, [statusFilter, user]);

    const fetchWorkers = async () => {
        try {
            const data = await usersAPI.getAll();
            // Include all staff roles: workers, managers, secretary, ceo
            setWorkers(data.filter(u => {
                // Roles are usually returned as an array of objects: [{id: 1, name: 'ceo', ...}]
                // but some endpoints might return them as strings or in u.role
                const roleNames = u.roles?.map(r => (typeof r === 'string' ? r : r.name)) || [u.role];
                return roleNames.some(role => ['worker', 'manager', 'secretary', 'ceo', 'super_admin'].includes(role));
            }));
        } catch (error) {
            console.error('Failed to load workers for surplus entry', error);
        }
    };

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const data = await surplusAPI.getAll(statusFilter === 'all' ? null : statusFilter);
            setWorkerBalances(data.worker_balances || []);
            setTotals(data.totals || { total_available: 0, total_allocated: 0, total_withdrawn: 0 });
        } catch (error) {
            console.error('Failed to fetch surplus worker balances:', error);
            showError(error.message || 'Failed to load surplus balances');
            setWorkerBalances([]);
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
            showSuccess('Surplus amount added successfully!');
        } catch (error) {
            console.error('Failed to add surplus:', error);
            showError(error.message || 'Failed to add surplus');
        }
    };

    const handleAllocate = async (workerId, customerCardId, amount) => {
        try {
            await surplusAPI.allocate(workerId, customerCardId, amount, 'Allocated via CEO Dashboard');
            fetchEntries();
            setAllocatingWorker(null);
            showSuccess('Surplus allocated successfully! Boxes have been updated.');
        } catch (error) {
            console.error('Failed to allocate surplus:', error);
            showError(error.message || 'Failed to allocate surplus');
        }
    };

    const handleWithdraw = async (worker) => {
        const maxAmount = parseFloat(worker.current_balance) || 0;
        const { value: amountStr } = await Swal.fire({
            title: 'Withdraw Surplus',
            input: 'number',
            inputLabel: `Amount to Withdraw (Max: GHS ${maxAmount.toFixed(2)})`,
            inputPlaceholder: 'Enter amount...',
            showCancelButton: true,
            confirmButtonColor: '#FF4444',
            inputValidator: (value) => {
                if (!value) return 'You need to write an amount!';
                const val = parseFloat(value);
                if (val <= 0) return 'Amount must be greater than zero.';
                if (val > maxAmount) return 'Amount exceeds the worker\'s current surplus balance.';
            }
        });

        if (!amountStr) return;

        const result = await showTextareaPrompt('Enter withdrawal reason:', 'Reason for Withdrawal', 'Enter notes...');
        if (!result.isConfirmed || !result.value) return;

        try {
            await surplusAPI.withdraw(worker.worker_id, parseFloat(amountStr), result.value);
            fetchEntries();
            showSuccess('Surplus withdrawn successfully!');
        } catch (error) {
            console.error('Failed to withdraw surplus:', error);
            showError(error.message || 'Failed to withdraw surplus');
        }
    };

    const handleAdjust = async (worker) => {
        const { value: formValues } = await Swal.fire({
            title: 'Adjust Worker Balance',
            html:
                '<div style="text-align: left; margin-bottom: 10px;">' +
                '<label style="display: block; margin-bottom: 5px;">Adjustment Amount (positive to add, negative to subtract)</label>' +
                '<input id="swal-amount" class="swal2-input" type="number" step="0.01" placeholder="e.g. 10.00 or -5.00">' +
                '</div>' +
                '<div style="text-align: left;">' +
                '<label style="display: block; margin-bottom: 5px;">Reason for Adjustment</label>' +
                '<textarea id="swal-notes" class="swal2-textarea" placeholder="Describe why you are changing the balance..."></textarea>' +
                '</div>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Record Adjustment',
            preConfirm: () => {
                const amount = document.getElementById('swal-amount').value;
                const notes = document.getElementById('swal-notes').value;
                if (!amount) {
                    Swal.showValidationMessage('Please enter an amount');
                    return false;
                }
                if (!notes) {
                    Swal.showValidationMessage('Please enter a reason');
                    return false;
                }
                return { amount: parseFloat(amount), notes: notes };
            }
        });

        if (!formValues) return;

        try {
            await surplusAPI.adjust(worker.worker_id, formValues.amount, formValues.notes);
            fetchEntries();
            showSuccess('Worker balance adjusted successfully!');
        } catch (error) {
            console.error('Failed to adjust surplus:', error);
            showError(error.message || 'Failed to adjust surplus');
        }
    };

    if (loading) {
        return <div className="loading">Loading surplus data...</div>;
    }

    return (
        <div className="surplus-page">
            <div className="page-header">
                <h1>Pooled Surplus Ledger</h1>
                {isCEO && (
                    <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                        + Add Surplus Amount
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

            {/* Entries Table */}
            <div className="table-container surplus-table">
                <table>
                    <thead>
                        <tr>
                            <th>Worker</th>
                            <th>Branch</th>
                            <th className="amount-cell success-text">Total Accumulated</th>
                            <th className="amount-cell primary-text">Total Allocated</th>
                            <th className="amount-cell danger-text">Total Withdrawn</th>
                            <th className="amount-cell">Current Pool Balance</th>
                            {isCEO && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {workerBalances.length === 0 ? (
                            <tr>
                                <td colSpan={isCEO ? "7" : "6"} className="empty-state">
                                    No worker surplus balances found
                                </td>
                            </tr>
                        ) : (
                            workerBalances.map((worker) => (
                                <tr key={worker.worker_id}>
                                    <td data-label="Worker">
                                        <div className="worker-info">
                                            <span className="worker-name">{worker.worker_name}</span>
                                        </div>
                                    </td>
                                    <td data-label="Branch">{worker.branch_name}</td>
                                    <td data-label="Total Accumulated" className="amount-cell success-text">
                                        +GHS {(parseFloat(worker.total_added) || 0).toFixed(2)}
                                    </td>
                                    <td data-label="Total Allocated" className="amount-cell primary-text">
                                        -GHS {(parseFloat(worker.total_allocated) || 0).toFixed(2)}
                                    </td>
                                    <td data-label="Total Withdrawn" className="amount-cell danger-text">
                                        -GHS {(parseFloat(worker.total_withdrawn) || 0).toFixed(2)}
                                    </td>
                                    <td data-label="Current Balance" className="amount-cell">
                                        <strong>GHS {(parseFloat(worker.current_balance) || 0).toFixed(2)}</strong>
                                    </td>
                                    {isCEO && (
                                        <td data-label="Actions">
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn-icon-small edit"
                                                    style={{ backgroundColor: '#22c55e', color: 'white', border: 'none' }}
                                                    onClick={() => setAllocatingWorker(worker)}
                                                    disabled={worker.current_balance <= 0}
                                                >
                                                    Allocate
                                                </button>
                                                <button
                                                    className="btn-icon-small"
                                                    style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none' }}
                                                    onClick={() => handleAdjust(worker)}
                                                >
                                                    Adjust
                                                </button>
                                                <button
                                                    className="btn-icon-small delete"
                                                    onClick={() => handleWithdraw(worker)}
                                                    disabled={worker.current_balance <= 0}
                                                >
                                                    Withdraw
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
            {allocatingWorker && (
                <AllocateSurplusModal
                    worker={allocatingWorker}
                    onClose={() => setAllocatingWorker(null)}
                    onSubmit={(cardId, amount) => handleAllocate(allocatingWorker.worker_id, cardId, amount)}
                />
            )}
        </div>
    );
}

function AllocateSurplusModal({ onClose, onSubmit, worker }) {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [allocationAmount, setAllocationAmount] = useState('');
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    useEffect(() => {
        if (worker?.worker_id) {
            fetchCustomers(worker.worker_id);
        }
    }, [worker]);

    const fetchCustomers = async (workerId) => {
        setLoadingCustomers(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers?worker_id=${workerId}&status=in_progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setCustomers(data.data || []);
        } catch (error) {
            console.error('Failed to load customers', error);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedCardId) {
            showError('Please select a customer.');
            return;
        }

        const numericAmount = parseFloat(allocationAmount) || 0;
        if (numericAmount <= 0) {
            showError('Please enter a valid amount.');
            return;
        }

        if (numericAmount > worker.current_balance) {
            showError('Amount exceeds worker balance.');
            return;
        }

        onSubmit(selectedCardId, numericAmount);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Allocate Surplus Funds</h2>
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderLeft: '4px solid var(--primary-color)', borderRadius: '4px' }}>
                    <strong>Worker:</strong> {worker.worker_name} <br />
                    <strong>Max Available:</strong> GHS {(parseFloat(worker.current_balance) || 0).toFixed(2)}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>1. Search & Select Customer *</label>
                        <input
                            type="text"
                            placeholder="Type name here to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ marginBottom: '10px' }}
                        />

                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '5px' }}>
                            {loadingCustomers ? (
                                <p style={{ padding: '10px' }}>Loading workers customers...</p>
                            ) : filteredCustomers.length === 0 ? (
                                <p style={{ padding: '10px' }}>No customers found for this worker.</p>
                            ) : (
                                filteredCustomers.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            if (c.active_card) {
                                                setSelectedCardId(c.active_card.id);
                                                setSearchTerm(c.name);
                                            } else {
                                                showError("This customer doesn't have an active card.");
                                            }
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            backgroundColor: selectedCardId == c.active_card?.id ? 'var(--primary-color)' : 'transparent',
                                            color: selectedCardId == c.active_card?.id ? 'black' : 'inherit',
                                            borderBottom: '1px solid var(--border-color)',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                            {c.active_card ? `Active Card: ${c.active_card.card_name} (Price: GHS ${c.active_card.box_price})` : 'No Active Card'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>2. Amount to Allocate *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={allocationAmount}
                            onChange={(e) => setAllocationAmount(e.target.value)}
                            required
                            placeholder="Enter amount to pay"
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-success">Confirm Allocation</button>
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
                            {workers.map((w) => {
                                const roleName = w.roles?.[0]?.name || w.roles?.[0] || w.role || 'Staff';
                                return (
                                    <option key={w.id} value={w.id}>{w.name} ({roleName})</option>
                                );
                            })}
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
