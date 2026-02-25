import { useState, useEffect } from 'react';
import { closeOfDayAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { Clock, Lock, Unlock, Edit3, Save, X, CheckCircle } from 'lucide-react';
import '../styles/CloseOfDay.css';

function CloseOfDay() {
    const { user, hasRole } = useAuth();
    const isCEO = hasRole('ceo');
    const isWorker = hasRole('worker');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingWorker, setEditingWorker] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editNote, setEditNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await closeOfDayAPI.getAll({ date: selectedDate });
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch close of day:', error);
            showError('Failed to load close of day data');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async (workerId, workerName) => {
        const selfClose = isWorker && workerId === user?.id;
        const msg = selfClose
            ? 'Are you sure you want to close your day? You will NOT be able to record any more payments today. This action cannot be undone.'
            : `Close ${workerName}'s day? They will not be able to record payments for this date.`;

        const confirmed = await showConfirm(msg);
        if (!confirmed) return;

        try {
            setActionLoading(workerId);
            await closeOfDayAPI.close(workerId, { date: selectedDate });
            showSuccess(selfClose ? 'Your day has been closed' : `${workerName}'s day has been closed`);
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to close');
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpen = async (workerId, workerName) => {
        const confirmed = await showConfirm(`Reopen ${workerName}'s day? They will be able to record payments again.`);
        if (!confirmed) return;

        try {
            setActionLoading(workerId);
            await closeOfDayAPI.open(workerId, { date: selectedDate });
            showSuccess(`${workerName}'s day has been reopened`);
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to reopen');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEdit = (worker) => {
        setEditingWorker(worker.worker_id);
        setEditAmount(worker.adjusted_amount ?? worker.actual_sales);
        setEditNote(worker.adjustment_note || '');
    };

    const handleCancel = () => {
        setEditingWorker(null);
        setEditAmount('');
        setEditNote('');
    };

    const handleSave = async (workerId) => {
        try {
            setSaving(true);
            await closeOfDayAPI.update(workerId, {
                date: selectedDate,
                adjusted_amount: parseFloat(editAmount),
                adjustment_note: editNote,
            });
            showSuccess('Amount adjusted');
            setEditingWorker(null);
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to adjust amount');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading close of day...</div>;

    return (
        <div className="close-of-day-page">
            <div className="cod-header">
                <div>
                    <h1><Clock size={24} /> Close of Day</h1>
                    <p className="cod-subtitle">
                        {isWorker ? 'Your daily sales summary' : 'Daily worker sales summary'}
                    </p>
                </div>
                <div className="cod-controls">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="cod-date-picker"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="cod-summary">
                <div className="cod-summary-card">
                    <span className="cod-label">{isWorker ? 'Payments' : 'Total Workers'}</span>
                    <span className="cod-value">
                        {isWorker ? (data?.workers?.[0]?.payments_count || 0) : (data?.workers?.length || 0)}
                    </span>
                </div>
                <div className="cod-summary-card">
                    <span className="cod-label">Total Sales</span>
                    <span className="cod-value">GHS {(data?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {!isWorker && (
                    <div className="cod-summary-card">
                        <span className="cod-label">Closed Workers</span>
                        <span className="cod-value">{data?.workers?.filter(w => w.is_closed).length || 0} / {data?.workers?.length || 0}</span>
                    </div>
                )}
            </div>

            {/* Workers Table */}
            <div className="cod-table-container">
                <table className="cod-table">
                    <thead>
                        <tr>
                            <th>Worker</th>
                            {!isWorker && <th>Branch</th>}
                            <th>Payments</th>
                            <th>Sales</th>
                            {isCEO && <th>Adjusted</th>}
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.workers?.length > 0 ? (
                            data.workers.map((worker) => (
                                <tr key={worker.worker_id} className={worker.is_closed ? 'closed-row' : ''}>
                                    <td className="worker-name-cell">
                                        <div className="worker-avatar">{worker.worker_name.charAt(0)}</div>
                                        <div>
                                            <div>{worker.worker_name}</div>
                                            {isWorker && <small style={{ color: 'var(--text-secondary)' }}>{worker.branch_name}</small>}
                                        </div>
                                    </td>
                                    {!isWorker && <td>{worker.branch_name}</td>}
                                    <td>{worker.payments_count}</td>
                                    <td className="amount-cell">GHS {worker.actual_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    {isCEO && (
                                        <td className="amount-cell">
                                            {editingWorker === worker.worker_id ? (
                                                <div className="edit-inline">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                        className="edit-amount-input"
                                                        autoFocus
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Note..."
                                                        value={editNote}
                                                        onChange={(e) => setEditNote(e.target.value)}
                                                        className="edit-note-input"
                                                    />
                                                </div>
                                            ) : worker.adjusted_amount !== null ? (
                                                <div>
                                                    <span className="adjusted-badge">GHS {Number(worker.adjusted_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    {worker.adjustment_note && <small className="adj-note">{worker.adjustment_note}</small>}
                                                </div>
                                            ) : (
                                                <span className="no-adjustment">—</span>
                                            )}
                                        </td>
                                    )}
                                    <td>
                                        {worker.is_closed ? (
                                            <span className="status-closed"><Lock size={14} /> Closed</span>
                                        ) : (
                                            <span className="status-open"><Unlock size={14} /> Open</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-btns">
                                            {/* Close/Open buttons */}
                                            {worker.is_closed ? (
                                                isCEO && (
                                                    <button
                                                        className="btn-open"
                                                        onClick={() => handleOpen(worker.worker_id, worker.worker_name)}
                                                        disabled={actionLoading === worker.worker_id}
                                                        title="Reopen this worker's day"
                                                    >
                                                        <Unlock size={14} /> Open
                                                    </button>
                                                )
                                            ) : (
                                                (isCEO || (isWorker && worker.worker_id === user?.id)) && (
                                                    <button
                                                        className="btn-close-day"
                                                        onClick={() => handleClose(worker.worker_id, worker.worker_name)}
                                                        disabled={actionLoading === worker.worker_id}
                                                        title={isWorker ? "Close your day" : "Close this worker's day"}
                                                    >
                                                        <Lock size={14} /> Close
                                                    </button>
                                                )
                                            )}

                                            {/* CEO adjust button */}
                                            {isCEO && (
                                                editingWorker === worker.worker_id ? (
                                                    <>
                                                        <button className="btn-save" onClick={() => handleSave(worker.worker_id)} disabled={saving}>
                                                            <Save size={14} />
                                                        </button>
                                                        <button className="btn-cancel" onClick={handleCancel}>
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button className="btn-edit" onClick={() => handleEdit(worker)} title="Adjust amount">
                                                        <Edit3 size={14} />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isCEO ? 7 : isWorker ? 5 : 6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    No data for this date
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CloseOfDay;
