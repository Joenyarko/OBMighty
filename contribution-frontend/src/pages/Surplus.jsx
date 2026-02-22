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
    const { user } = useAuth();

    // Robust CEO check
    const isCEO = user?.roles?.some(r => r.name === 'ceo') || user?.role === 'ceo';

    useEffect(() => {
        fetchEntries();
        if (isCEO) {
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
        const maxAmount = parseFloat(worker.current_balance);
        const { value: amountStr } = await Swal.fire({
            title: 'Withdraw Surplus',
            input: 'number',
            inputLabel: `Amount to Withdraw (Max: GHS ${maxAmount.toFixed(2)})`,
            inputPlaceholder: 'Enter amount...',
            showCancelButton: true,
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
                                        +GHS {parseFloat(worker.total_added).toFixed(2)}
                                    </td>
                                    <td data-label="Total Allocated" className="amount-cell primary-text">
                                        -GHS {parseFloat(worker.total_allocated).toFixed(2)}
                                    </td>
                                    <td data-label="Total Withdrawn" className="amount-cell danger-text">
                                        -GHS {parseFloat(worker.total_withdrawn).toFixed(2)}
                                    </td>
                                    <td data-label="Current Balance" className="amount-cell">
                                        <strong>GHS {parseFloat(worker.current_balance).toFixed(2)}</strong>
                                    </td>
                                    {isCEO && (
                                        <td data-label="Actions">
                                            {worker.current_balance > 0 ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="btn-small btn-success"
                                                        onClick={() => setAllocatingWorker(worker)}
                                                    >
                                                        Allocate
                                                    </button>
                                                    <button
                                                        className="btn-small btn-danger"
                                                        onClick={() => handleWithdraw(worker)}
                                                    >
                                                        Withdraw
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#999', fontSize: '0.9em' }}>No funds</span>
                                            )}
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

        const numericAmount = parseFloat(allocationAmount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            showError('Please enter a valid amount greater than 0.');
            return;
        }

        if (numericAmount > worker.current_balance) {
            showError(`Amount cannot exceed the worker's current balance of GHS ${parseFloat(worker.current_balance).toFixed(2)}.`);
            return;
        }

        onSubmit(selectedCardId, numericAmount);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Allocate Surplus Funds</h2>
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                    <strong>Worker: </strong> {worker.worker_name} <br />
                    <strong>Max Available Balance: </strong> GHS {parseFloat(worker.current_balance).toFixed(2)}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>1. Select Customer Card *</label>
                        <select
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                            required
                            disabled={loadingCustomers}
                        >
                            <option value="">
                                {loadingCustomers ? 'Loading customers...' : 'Select a customer...'}
                            </option>
                            {customers.map((c) => {
                                const boxPrice = c.active_card.box_price || 0;
                                return (
                                    <option key={c.active_card.id} value={c.active_card.id}>
                                        {c.name} - {c.active_card.card_name} (Box Price: GHS {boxPrice})
                                    </option>
                                );
                            })}
                        </select>
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                            Only customers with active cards assigned to this worker are shown.
                        </small>
                    </div>

                    <div className="form-group">
                        <label>2. Amount to Allocate *</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={worker.current_balance}
                            value={allocationAmount}
                            onChange={(e) => setAllocationAmount(e.target.value)}
                            required
                            placeholder={`Max: GHS ${parseFloat(worker.current_balance).toFixed(2)}`}
                        />
                        {allocationAmount && selectedCardId && (
                            <div style={{ marginTop: '5px', fontSize: '13px', color: 'green' }}>
                                {(() => {
                                    const card = customers.find(c => c.active_card?.id === parseInt(selectedCardId));
                                    const boxPrice = card?.active_card?.box_price || 0;
                                    if (boxPrice > 0) {
                                        const boxes = Math.floor(parseFloat(allocationAmount) / boxPrice);
                                        return `Translates to roughly ~${boxes} boxes marked.`;
                                    }
                                    return '';
                                })()}
                            </div>
                        )}
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
