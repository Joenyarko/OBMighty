import { useState, useEffect } from 'react';
import { closeOfDayAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/sweetalert';
import { Clock, Edit3, Save, X } from 'lucide-react';
import '../styles/CloseOfDay.css';

function CloseOfDay() {
    const { user } = useAuth();
    const isCEO = user?.roles?.some(r => r.name === 'ceo');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingWorker, setEditingWorker] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editNote, setEditNote] = useState('');
    const [saving, setSaving] = useState(false);

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
            showSuccess('Close of day amount adjusted');
            setEditingWorker(null);
            fetchData();
        } catch (error) {
            console.error('Failed to adjust:', error);
            showError('Failed to adjust amount');
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
                    <p className="cod-subtitle">Daily worker sales summary</p>
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
                    <span className="cod-label">Total Workers</span>
                    <span className="cod-value">{data?.workers?.length || 0}</span>
                </div>
                <div className="cod-summary-card">
                    <span className="cod-label">Total Sales</span>
                    <span className="cod-value">GHS {(data?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="cod-summary-card">
                    <span className="cod-label">Adjusted Total</span>
                    <span className="cod-value">GHS {(data?.total_adjusted || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Workers Table */}
            <div className="cod-table-container">
                <table className="cod-table">
                    <thead>
                        <tr>
                            <th>Worker</th>
                            <th>Branch</th>
                            <th>Payments</th>
                            <th>Actual Sales</th>
                            <th>Adjusted Amount</th>
                            <th>Final Amount</th>
                            {isCEO && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data?.workers?.length > 0 ? (
                            data.workers.map((worker) => (
                                <tr key={worker.worker_id} className={worker.adjusted_amount !== null ? 'adjusted-row' : ''}>
                                    <td className="worker-name-cell">
                                        <div className="worker-avatar">{worker.worker_name.charAt(0)}</div>
                                        {worker.worker_name}
                                    </td>
                                    <td>{worker.branch_name}</td>
                                    <td>{worker.payments_count}</td>
                                    <td className="amount-cell">GHS {worker.actual_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                                                    placeholder="Note (optional)"
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
                                    <td className="amount-cell final-amount">
                                        GHS {worker.final_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    {isCEO && (
                                        <td>
                                            {editingWorker === worker.worker_id ? (
                                                <div className="action-btns">
                                                    <button className="btn-save" onClick={() => handleSave(worker.worker_id)} disabled={saving}>
                                                        <Save size={16} />
                                                    </button>
                                                    <button className="btn-cancel" onClick={handleCancel}>
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="btn-edit" onClick={() => handleEdit(worker)}>
                                                    <Edit3 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isCEO ? 7 : 6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    No worker data for this date
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
