import { useState, useEffect } from 'react';
import { closeOfDayAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Clock, Lock, Unlock, Edit3, Save, X, CheckCircle, Download } from 'lucide-react';
import '../styles/CloseOfDay.css';

function CloseOfDay() {
    const { user, hasRole } = useAuth();
    const isCEO = hasRole('ceo');
    const isWorker = hasRole('worker');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('daily');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingWorker, setEditingWorker] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editNote, setEditNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchData();
    }, [selectedDate, selectedMonth, viewMode]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (viewMode === 'monthly') {
                const response = await closeOfDayAPI.getMonthly({ month: selectedMonth });
                setData(response.data);
            } else {
                const response = await closeOfDayAPI.getAll({ date: selectedDate });
                setData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch close of day:', error);
            showError('Failed to load close of day data');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async (workerId, workerName) => {
        const selfClose = isWorker && workerId === user?.id;
        
        const workerData = data?.workers?.find(w => w.worker_id === workerId);
        const expected = workerData?.final_amount || 0;

        const { value: formValues } = await Swal.fire({
            title: selfClose ? 'Close Your Day' : `Close ${workerName}'s Day`,
            html: `
                <p style="text-align: left; margin-bottom: 15px; font-size: 14px; color: #ccc;">
                    ${selfClose ? 'You will NOT be able to record any more payments today.' : 'They will not be able to record payments for this date.'}
                </p>
                <div style="text-align: left; margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; margin-bottom: 5px;">Expected System Cash (GHS ${expected.toLocaleString(undefined, { minimumFractionDigits: 2 })})</label>
                    <input id="swal-input-cash" type="number" step="0.01" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="Enter Physical Cash Counted">
                </div>
                <div style="text-align: left;">
                    <label style="display: block; font-size: 13px; margin-bottom: 5px;">Notes (Optional)</label>
                    <textarea id="swal-input-notes" class="swal2-textarea" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="Explain any discrepancies here..."></textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#D4AF37',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Confirm Close',
            background: '#1a1a1a',
            color: '#fff',
            preConfirm: () => {
                const cash = document.getElementById('swal-input-cash').value;
                const notes = document.getElementById('swal-input-notes').value;
                if (!cash) {
                    Swal.showValidationMessage('Please enter the physical cash counted');
                    return false;
                }
                return { actual_cash_counted: cash, closing_notes: notes };
            }
        });

        if (!formValues) return;

        try {
            setActionLoading(workerId);
            await closeOfDayAPI.close(workerId, { 
                date: selectedDate,
                actual_cash_counted: formValues.actual_cash_counted,
                closing_notes: formValues.closing_notes
            });
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

    const exportToPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(viewMode === 'monthly' ? 'Monthly Reconciliation Summary' : 'Close of Day Report', 14, 22);
        
        doc.setFontSize(11);
        doc.text(viewMode === 'monthly' ? `Month: ${selectedMonth}` : `Date: ${selectedDate}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

        let tableColumn = [];
        let tableRows = [];

        if (viewMode === 'monthly') {
            tableColumn = ["Worker", "Branch", "Days Worked", "Expected Cash", "Actual Cash", "Discrepancy"];
            data?.workers?.forEach(worker => {
                tableRows.push([
                    worker.worker_name,
                    worker.branch_name || '-',
                    worker.total_days_worked,
                    `GHS ${Number(worker.expected_cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    `GHS ${Number(worker.actual_cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    `GHS ${Number(worker.net_discrepancy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ]);
            });
        } else {
            tableColumn = ["Worker", "Branch", "Payments", "Expected Cash", "Actual Cash", "Discrepancy", "Status"];
            data?.workers?.forEach(worker => {
                tableRows.push([
                    worker.worker_name,
                    worker.branch_name || '-',
                    worker.payments_count,
                    `GHS ${Number(worker.final_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    worker.actual_cash_counted ? `GHS ${Number(worker.actual_cash_counted || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-',
                    worker.discrepancy_amount !== undefined && worker.discrepancy_amount !== null 
                        ? `GHS ${Number(worker.discrepancy_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                        : '-',
                    worker.is_closed ? 'Closed' : 'Open'
                ]);
            });
        }

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [212, 175, 55] },
        });

        doc.save(viewMode === 'monthly' ? `Monthly_Summary_${selectedMonth}.pdf` : `Close_Of_Day_${selectedDate}.pdf`);
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
                <div className="cod-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="cod-date-picker"
                        style={{ width: 'auto' }}
                    >
                        <option value="daily">Daily View</option>
                        <option value="monthly">Monthly Summary</option>
                    </select>

                    {viewMode === 'daily' ? (
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="cod-date-picker"
                        />
                    ) : (
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="cod-date-picker"
                        />
                    )}
                    <button 
                        onClick={exportToPDF} 
                        className="btn-export-pdf" 
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', backgroundColor: '#D4AF37', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        title="Download as PDF"
                    >
                        <Download size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="cod-summary">
                <div className="cod-summary-card">
                    <span className="cod-label">{viewMode === 'monthly' ? 'Total Workers' : (isWorker ? 'Payments' : 'Total Workers')}</span>
                    <span className="cod-value">
                        {viewMode === 'monthly' ? (data?.workers?.length || 0) : (isWorker ? (data?.workers?.[0]?.payments_count || 0) : (data?.workers?.length || 0))}
                    </span>
                </div>
                <div className="cod-summary-card">
                    <span className="cod-label">Expected Cash</span>
                    <span className="cod-value">GHS {viewMode === 'monthly' ? (data?.total_expected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : (data?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="cod-summary-card">
                    <span className="cod-label">Net Discrepancy</span>
                    <span className="cod-value">
                        {viewMode === 'monthly' ? (
                            data?.net_discrepancy < 0 ? (
                                <span style={{color: '#ff4d4d'}}>-GHS {Math.abs(data?.net_discrepancy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            ) : data?.net_discrepancy > 0 ? (
                                <span style={{color: '#4caf50'}}>+GHS {(data?.net_discrepancy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            ) : (
                                <span style={{color: '#4caf50'}}>GHS 0.00</span>
                            )
                        ) : (
                            !isWorker && (data?.workers?.filter(w => w.is_closed).length || 0) + ' / ' + (data?.workers?.length || 0) + ' Closed'
                        )}
                    </span>
                </div>
            </div>

            {/* Workers Table */}
            <div className="cod-table-container">
                <table className="cod-table">
                    <thead>
                        {viewMode === 'monthly' ? (
                            <tr>
                                <th>Worker</th>
                                {!isWorker && <th>Branch</th>}
                                <th>Days Worked</th>
                                <th>Expected Cash</th>
                                <th>Actual Cash</th>
                                <th>Discrepancy</th>
                            </tr>
                        ) : (
                            <tr>
                                <th>Worker</th>
                                {!isWorker && <th>Branch</th>}
                                <th>Payments</th>
                                <th>Sales</th>
                                {isCEO && <th>Adjusted</th>}
                                <th>Discrepancy</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        )}
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
                                    
                                    {viewMode === 'monthly' ? (
                                        <>
                                            <td>{worker.total_days_worked}</td>
                                            <td className="amount-cell">GHS {Number(worker.expected_cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="amount-cell">GHS {Number(worker.actual_cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td>
                                                {Number(worker.net_discrepancy) < 0 ? (
                                                    <span style={{color: '#ff4d4d', fontWeight: 'bold'}}>-GHS {Math.abs(Number(worker.net_discrepancy)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                ) : Number(worker.net_discrepancy) > 0 ? (
                                                    <span style={{color: '#4caf50', fontWeight: 'bold'}}>+GHS {Number(worker.net_discrepancy).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                ) : (
                                                    <span style={{color: '#4caf50'}}><CheckCircle size={12} style={{display: 'inline', marginBottom: '-2px'}}/> Matched</span>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{worker.payments_count}</td>
                                            <td className="amount-cell">GHS {Number(worker.actual_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                                                {worker.is_closed && worker.discrepancy_amount !== undefined ? (
                                                    Number(worker.discrepancy_amount) < 0 ? (
                                                        <span style={{color: '#ff4d4d', fontWeight: 'bold'}}>-GHS {Math.abs(Number(worker.discrepancy_amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    ) : Number(worker.discrepancy_amount) > 0 ? (
                                                        <span style={{color: '#4caf50', fontWeight: 'bold'}}>+GHS {Number(worker.discrepancy_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    ) : (
                                                        <span style={{color: '#4caf50'}}><CheckCircle size={12} style={{display: 'inline', marginBottom: '-2px'}}/> Matched</span>
                                                    )
                                                ) : (
                                                    <span style={{color: 'var(--text-secondary)'}}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                {worker.is_closed ? (
                                                    <span className="status-closed"><Lock size={14} /> Closed</span>
                                                ) : (
                                                    <span className="status-open"><Unlock size={14} /> Open</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="action-btns">
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
                                        </>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={viewMode === 'monthly' ? 6 : (isCEO ? 8 : (isWorker ? 5 : 7))} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
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
