import { useState, useEffect } from 'react';
import { userAPI, customerAPI } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext';

function TransferCustomerModal({ customer, onClose, onSuccess }) {
    const { user, isCEO, isSuperAdmin } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            const response = await userAPI.getAll();
            const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            let workerList = raw.filter(u => u.roles?.some(r => (typeof r === 'string' ? r === 'worker' : r.name === 'worker')));
            
            // If manager has a branch_id and is not CEO, filter to their branch
            if (!isCEO && !isSuperAdmin && user?.branch_id) {
                workerList = workerList.filter(w => w.branch_id === user.branch_id);
            }

            setWorkers(workerList);
        } catch (error) {
            console.error('Failed to fetch workers', error);
            showError('Failed to load worker list');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!selectedWorker) {
            showError('Please select a new worker');
            return;
        }

        if (selectedWorker == customer.worker_id) {
            showError('Customer is already assigned to this worker');
            return;
        }

        const confirm = await showConfirm(
            `Transfer ${customer.name} to new worker?`,
            'Confirm Transfer'
        );

        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        try {
            await customerAPI.transfer(customer.id, selectedWorker);
            showSuccess('Customer transferred successfully');
            onSuccess(); // Refresh parent list
            onClose();
        } catch (error) {
            console.error('Transfer failed', error);
            showError('Failed to transfer customer');
        } finally {
            setSubmitting(false);
        }
    };

    if (!customer) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Transfer Customer</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p><strong>Customer:</strong> {customer.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Current Worker: {customer.worker?.name || 'Unassigned'}
                    </p>

                    <div className="form-group">
                        <label>New Worker</label>
                        {loading ? (
                            <p>Loading workers...</p>
                        ) : (
                            <select
                                value={selectedWorker}
                                onChange={(e) => setSelectedWorker(e.target.value)}
                                className="form-control"
                            >
                                <option value="">Select a worker...</option>
                                {workers.map(worker => (
                                    <option key={worker.id} value={worker.id}>
                                        {worker.name} ({worker.branch?.name || 'No Branch'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button
                            className="btn-primary"
                            onClick={handleTransfer}
                            disabled={submitting || !selectedWorker}
                        >
                            {submitting ? 'Transferring...' : 'Confirm Transfer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TransferCustomerModal;
