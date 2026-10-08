import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import api, { closeOfDayAPI } from '../services/api';
import '../styles/CustomerBoxTracking.css';

const customerCardAPI = {
    getCustomerCard: (customerId) => api.get(`/customer-cards/customer/${customerId}`),
    getBoxStates: (id) => api.get(`/customer-cards/${id}/box-states`),
    checkBoxes: (id, data) => api.post(`/customer-cards/${id}/check-boxes`, data),
    getPaymentHistory: (id) => api.get(`/customer-cards/${id}/payment-history`),
    getDailySales: (id, date) => api.get(`/customer-cards/${id}/daily-sales`, { params: { date } }),
    reversePayment: (paymentId) => api.delete(`/box-payments/${paymentId}`),
    adjustPayment: (paymentId, data) => api.patch(`/box-payments/${paymentId}`, data),
    closeCard: (id) => api.patch(`/customer-cards/${id}/close`),
    applyPenalty: (id, data) => api.post(`/customer-cards/${id}/apply-penalty`, data),
};

function CustomerBoxTracking() {
    const { customerId } = useParams();
    const navigate = useNavigate();
    const { isCEO, user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [customerCard, setCustomerCard] = useState(null);
    const [boxStates, setBoxStates] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [dailySales, setDailySales] = useState(0);
    const [workerClosed, setWorkerClosed] = useState(false);

    // Payment form state
    const [paymentForm, setPaymentForm] = useState({
        amount_paid: '',
        boxes_to_check: '',
        payment_method: 'cash',
        notes: ''
    });

    // Adjust payment modal state
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [adjustForm, setAdjustForm] = useState({
        new_amount: '',
        notes: ''
    });

    // Time Extension & Penalty modal state
    const [showPenaltyModal, setShowPenaltyModal] = useState(false);
    const [penaltyForm, setPenaltyForm] = useState({
        extended_due_date: '',
        percentage: '',
        extra_boxes: '',
        notes: ''
    });
    const [penaltySubmitting, setPenaltySubmitting] = useState(false);

    const canManageCards = isCEO || 
        (user?.roles && (
            Array.isArray(user.roles) 
                ? user.roles.some(r => {
                    const name = typeof r === 'string' ? r : r.name;
                    return ['super_admin', 'manager', 'secretary', 'branch_manager'].includes(name);
                })
                : ['super_admin', 'manager', 'secretary', 'branch_manager'].includes(user.role)
        ));

    useEffect(() => {
        fetchData();
        checkWorkerClosed();
    }, [customerId]);

    const checkWorkerClosed = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await closeOfDayAPI.getAll({ date: today });
            const workers = res.data?.workers || [];
            // Check if current user's worker is closed
            const me = workers.find(w => w.worker_id === user?.id);
            setWorkerClosed(me?.is_closed || false);
        } catch (err) {
            console.error('Failed to check close of day status', err);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Get the card first so we have the ID for following calls
            const cardRes = await customerCardAPI.getCustomerCard(customerId);
            const card = cardRes.data;

            if (!card || !card.id) {
                throw new Error("Invalid card data received");
            }

            // 2. Fetch related data in parallel using the card ID
            const [boxStatesRes, historyRes, salesRes] = await Promise.all([
                customerCardAPI.getBoxStates(card.id),
                customerCardAPI.getPaymentHistory(card.id),
                customerCardAPI.getDailySales(card.id, new Date().toISOString().split('T')[0]),
            ]);

            setCustomerCard(card);
            setBoxStates(boxStatesRes.data.box_states);
            setPaymentHistory(historyRes.data.data);
            setDailySales(salesRes.data.daily_sales);
        } catch (error) {
            console.error('Fetch error:', error);
            showError(error.response?.data?.message || 'Failed to load customer card data');
            navigate('/customers/list');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentForm(prev => {
            const updated = { ...prev, [name]: value };

            // Auto-calculate boxes from amount
            if (name === 'amount_paid' && value && customerCard) {
                const boxes = Math.floor(parseFloat(value) / customerCard.box_price);
                updated.boxes_to_check = boxes > 0 ? boxes : '';
            }

            // Auto-calculate amount from boxes
            if (name === 'boxes_to_check' && value && customerCard) {
                const amount = parseFloat(value) * customerCard.box_price;
                updated.amount_paid = amount > 0 ? amount.toFixed(2) : '';
            }

            return updated;
        });
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        if (!paymentForm.amount_paid && !paymentForm.boxes_to_check) {
            showError('Please enter either amount or number of boxes');
            return;
        }

        const confirmed = await showConfirm(
            `Are you sure you want to record this payment of GHS${paymentForm.amount_paid || '0.00'}?`,
            'Confirm Payment'
        );

        if (!confirmed.isConfirmed) return;

        try {
            await customerCardAPI.checkBoxes(customerCard.id, paymentForm);
            showSuccess('Payment recorded successfully!');
            setPaymentForm({
                amount_paid: '',
                boxes_to_check: '',
                payment_method: 'cash',
                notes: ''
            });
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to record payment');
        }
    };

    const handleReversePayment = async (payment) => {
        const confirmed = await showConfirm(
            `Are you sure you want to reverse this payment of GHS${parseFloat(payment.amount_paid).toFixed(2)}? This will uncheck ${payment.boxes_checked} boxes.`,
            'Reverse Payment',
            'warning'
        );

        if (!confirmed.isConfirmed) return;

        try {
            await customerCardAPI.reversePayment(payment.id);
            showSuccess('Payment reversed successfully!');
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to reverse payment');
        }
    };

    const handleOpenAdjustModal = (payment) => {
        setSelectedPayment(payment);
        setAdjustForm({
            new_amount: payment.amount_paid,
            notes: ''
        });
        setShowAdjustModal(true);
    };

    const handleAdjustPayment = async (e) => {
        e.preventDefault();

        const confirmed = await showConfirm(
            `Are you sure you want to adjust this payment to GHS${adjustForm.new_amount}?`,
            'Confirm Adjustment'
        );

        if (!confirmed.isConfirmed) return;

        try {
            await customerCardAPI.adjustPayment(selectedPayment.id, adjustForm);
            showSuccess('Payment adjusted successfully!');
            setShowAdjustModal(false);
            setSelectedPayment(null);
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to adjust payment');
        }
    };

    const handleCloseCard = async () => {
        const confirmed = await showConfirm(
            `Are you sure you want to CLOSE this card manually? This should only be done if the customer is stopping. All payment data will remain intact.`,
            'Close Card Manually',
            'warning'
        );

        if (!confirmed.isConfirmed) return;

        try {
            await customerCardAPI.closeCard(customerCard.id);
            showSuccess('Card closed successfully!');
            fetchData();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to close card');
        }
    };

    const openPenaltyModal = () => {
        const currentDue = customerCard?.customer?.due_date 
            ? new Date(customerCard.customer.due_date)
            : new Date();
        const extendedDate = new Date(currentDue);
        extendedDate.setMonth(extendedDate.getMonth() + 1);
        const dateStr = extendedDate.toISOString().split('T')[0];

        const defaultPct = customerCard?.customer?.company?.default_penalty_percentage ?? 10;
        const total = customerCard?.total_boxes || 0;
        const defaultExtra = Math.max(1, Math.ceil(total * (defaultPct / 100)));

        setPenaltyForm({
            extended_due_date: dateStr,
            percentage: defaultPct,
            extra_boxes: defaultExtra,
            notes: ''
        });
        setShowPenaltyModal(true);
    };

    const handlePenaltyChange = (e) => {
        const { name, value } = e.target;
        if (name === 'percentage') {
            const pct = parseFloat(value) || 0;
            const boxes = Math.max(1, Math.ceil((customerCard?.total_boxes || 0) * (pct / 100)));
            setPenaltyForm(prev => ({ ...prev, percentage: value, extra_boxes: boxes }));
        } else if (name === 'extra_boxes') {
            const boxes = parseInt(value) || 0;
            const total = customerCard?.total_boxes || 1;
            const pct = ((boxes / total) * 100).toFixed(1);
            setPenaltyForm(prev => ({ ...prev, extra_boxes: value, percentage: pct }));
        } else {
            setPenaltyForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleApplyPenalty = async (e) => {
        e.preventDefault();
        if (!penaltyForm.extended_due_date) {
            showError('Please select a new extended due date');
            return;
        }
        if (!penaltyForm.extra_boxes || parseInt(penaltyForm.extra_boxes) < 1) {
            showError('Please specify at least 1 extra penalty box');
            return;
        }

        const extraBoxes = parseInt(penaltyForm.extra_boxes);
        const penaltyCost = (extraBoxes * customerCard.box_price).toFixed(2);

        const confirmed = await showConfirm(
            `Apply ${extraBoxes} penalty boxes (GHS ${penaltyCost}) and extend due date to ${penaltyForm.extended_due_date}?`,
            'Confirm Overdue Time Extension'
        );
        if (!confirmed.isConfirmed) return;

        setPenaltySubmitting(true);
        try {
            const res = await customerCardAPI.applyPenalty(customerCard.id, {
                extended_due_date: penaltyForm.extended_due_date,
                extra_boxes: extraBoxes,
                percentage: parseFloat(penaltyForm.percentage) || null,
                notes: penaltyForm.notes || null
            });
            showSuccess(res.data.message || 'Time extension applied successfully!');
            setShowPenaltyModal(false);
            fetchData();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to apply penalty extension');
        } finally {
            setPenaltySubmitting(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading customer card...</div>;
    }

    if (!customerCard) {
        return <div className="no-data">No active card found for this customer</div>;
    }

    return (
        <div className="customer-box-tracking">
            {/* Header */}
            <div className="page-header">
                <button className="btn-back" onClick={() => navigate('/customers/list')}>
                    ← Back to Management
                </button>
                <h1>📦 Box Payment Tracking</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                        className="btn-secondary" 
                        onClick={() => {
                            const shareToken = customerCard?.customer?.share_token || customerId;
                            const url = `${window.location.origin}/passbook/${shareToken}`;
                            navigator.clipboard.writeText(url);
                            showSuccess('Digital Passbook link copied to clipboard!');
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#25d366',
                            color: '#000',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        📱 Share Passbook
                    </button>
                    {canManageCards && customerCard?.status === 'active' && (
                        <button className="btn-close-card" onClick={handleCloseCard}>
                            🔒 Close Card
                        </button>
                    )}
                    {canManageCards && (
                        <button className="btn-penalty-card" onClick={openPenaltyModal}>
                            ⚠️ Time Extension & Penalty
                        </button>
                    )}
                </div>
            </div>

            {/* Customer Details */}
            <div className="customer-details-card">
                <div className="customer-info">
                    <h2>{customerCard.customer.name}</h2>
                    <p>📞 {customerCard.customer.phone}</p>
                    <p>📍 {customerCard.customer.location}</p>
                </div>
                <div className="card-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {customerCard.card.front_image_url && (
                        <img
                            src={customerCard.card.front_image_url}
                            alt={customerCard.card.card_name}
                            style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    )}
                    <div>
                        <h3>{customerCard.card.card_name}</h3>
                        <span className="card-code">{customerCard.card.card_code}</span>
                    </div>
                </div>
            </div>

            {/* Overdue Penalty Banner if active */}
            {customerCard.penalty_boxes > 0 && (
                <div style={{
                    margin: '0 0 24px 0',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.08))',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <div>
                            <strong style={{ color: '#f59e0b', fontSize: '15px' }}>
                                Overdue Time Extension Active (+{customerCard.penalty_boxes} Penalty Boxes)
                            </strong>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Extra penalty value: <strong>GHS {parseFloat(customerCard.penalty_amount || 0).toFixed(2)}</strong>.
                                Extended due date: <strong>{customerCard.customer?.due_date || 'N/A'}</strong>.
                                {customerCard.penalty_notes && <span> Note: "{customerCard.penalty_notes}"</span>}
                            </p>
                        </div>
                    </div>
                    <span style={{
                        background: 'rgba(245, 158, 11, 0.25)',
                        color: '#f59e0b',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                    }}>
                        PENALTY APPLIED
                    </span>
                </div>
            )}

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-label">Total Boxes</div>
                    <div className="summary-value">{customerCard.total_boxes}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Boxes Checked</div>
                    <div className="summary-value checked">{customerCard.boxes_checked}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Boxes Remaining</div>
                    <div className="summary-value remaining">{customerCard.boxes_remaining}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Amount Paid</div>
                    <div className="summary-value amount">GHS{parseFloat(customerCard.amount_paid).toFixed(2)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Amount Remaining</div>
                    <div className="summary-value amount">GHS{parseFloat(customerCard.amount_remaining).toFixed(2)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Today's Sales</div>
                    <div className="summary-value daily">GHS{parseFloat(dailySales).toFixed(2)}</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-section">
                <div className="progress-label">
                    Completion: {customerCard.completion_percentage}%
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${customerCard.completion_percentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Record Payment Section */}
            <div className="payment-form-section card">
                <h3>💰 Record Payment</h3>

                {customerCard.status !== 'active' ? (
                    <div className="status-alert warning" style={{
                        padding: '16px',
                        background: 'rgba(253, 185, 19, 0.1)',
                        border: '1px solid var(--primary-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        fontWeight: '500'
                    }}>
                        ℹ️ This card is <strong>{customerCard.status}</strong>. No further payments can be recorded.
                    </div>
                ) : workerClosed ? (
                    <div style={{
                        padding: '20px',
                        background: 'rgba(255, 59, 48, 0.1)',
                        border: '1px solid #ff3b30',
                        borderRadius: '8px',
                        color: '#ff3b30',
                        textAlign: 'center',
                        fontWeight: '600'
                    }}>
                        🔒 Day is closed. Payments are locked. Contact your CEO to reopen.
                    </div>
                ) : (
                    <form onSubmit={handlePaymentSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Amount Paid (GHS)</label>
                                <input
                                    type="number"
                                    name="amount_paid"
                                    value={paymentForm.amount_paid}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 10.00"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="form-divider">OR</div>
                            <div className="form-group">
                                <label>Number of Boxes</label>
                                <input
                                    type="number"
                                    name="boxes_to_check"
                                    value={paymentForm.boxes_to_check}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 2"
                                    min="1"
                                    max={customerCard.boxes_remaining}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Payment Method</label>
                                <select
                                    name="payment_method"
                                    value={paymentForm.payment_method}
                                    onChange={handleInputChange}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Notes (Optional)</label>
                                <input
                                    type="text"
                                    name="notes"
                                    value={paymentForm.notes}
                                    onChange={handleInputChange}
                                    placeholder="Add any notes..."
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary">
                            Record Payment
                        </button>
                    </form>
                )}
            </div>

            {/* Box Grid */}
            <div className="box-grid-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>📋 Box Template ({customerCard.total_boxes} boxes @ GHS{customerCard.box_price} each)</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '12px', height: '12px', background: '#E53935', borderRadius: '2px', display: 'inline-block' }}></span> Deposit A
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '12px', height: '12px', background: '#1E88E5', borderRadius: '2px', display: 'inline-block' }}></span> Deposit B
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '12px', height: '12px', border: '2px dashed #f59e0b', borderRadius: '2px', display: 'inline-block' }}></span> ⚠️ Penalty Box
                        </span>
                    </div>
                </div>
                <div className="box-grid">
                    {boxStates.map(box => {
                        // Calculate color based on payment sequence
                        let colorClass = 'unchecked';
                        if (box.is_checked) {
                            if (box.payment_id) {
                                // Alternate colors based on unique payment IDs
                                const paymentIds = [...new Set(boxStates
                                    .filter(b => b.payment_id)
                                    .map(b => b.payment_id)
                                )].sort((a, b) => a - b);

                                const index = paymentIds.indexOf(box.payment_id);
                                colorClass = index % 2 === 0 ? 'red' : 'blue';
                            } else if (box.checked_date) {
                                // Fallback: alternate colors by checked_date groups
                                const checkedDates = [...new Set(boxStates
                                    .filter(b => b.is_checked && !b.payment_id && b.checked_date)
                                    .map(b => b.checked_date)
                                )].sort();

                                const dateIndex = checkedDates.indexOf(box.checked_date);
                                colorClass = dateIndex % 2 === 0 ? 'red' : 'blue';
                            } else {
                                colorClass = 'checked'; // Absolute fallback
                            }
                        }

                        const isPenalty = !!box.is_penalty;

                        return (
                            <div
                                key={box.id}
                                className={`box ${colorClass} ${isPenalty ? 'penalty-box' : ''}`}
                                title={isPenalty 
                                    ? `Penalty Box #${box.box_number} • ${box.is_checked ? `Checked on ${box.checked_date}` : 'Unchecked'}`
                                    : (box.is_checked ? `Checked on ${box.checked_date}` : 'Unchecked')}
                            >
                                {box.box_number}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment History */}
            <div className="payment-history-section">
                <h3>📜 Payment History</h3>
                {paymentHistory.length === 0 ? (
                    <div className="no-data">No payments recorded yet</div>
                ) : (
                    <table className="payment-history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Boxes Checked</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Worker</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentHistory.map(payment => (
                                <tr key={payment.id}>
                                    <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                    <td>{payment.boxes_checked}</td>
                                    <td className="amount">
                                        GHS{parseFloat(payment.amount_paid).toFixed(2)}
                                        {payment.adjusted_from && (
                                            <span className="adjusted-badge" title={`Originally GHS${parseFloat(payment.adjusted_from).toFixed(2)}`}>
                                                Adjusted
                                            </span>
                                        )}
                                    </td>
                                    <td>{payment.payment_method.replace('_', ' ')}</td>
                                    <td>{payment.worker.name}</td>
                                    <td>{payment.notes || '-'}</td>
                                    <td className="action-buttons">
                                        <button
                                            className="btn-adjust"
                                            onClick={() => handleOpenAdjustModal(payment)}
                                            title="Adjust payment amount"
                                        >
                                            🔄 Adjust
                                        </button>
                                        <button
                                            className="btn-reverse"
                                            onClick={() => handleReversePayment(payment)}
                                            title="Reverse this payment"
                                        >
                                            ❌ Reverse
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Adjust Payment Modal */}
            {showAdjustModal && selectedPayment && (
                <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🔄 Adjust Payment</h3>
                            <button className="close-btn" onClick={() => setShowAdjustModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAdjustPayment}>
                            <div className="modal-body">
                                <div className="info-row">
                                    <strong>Current Amount:</strong> GHS{parseFloat(selectedPayment.amount_paid).toFixed(2)}
                                </div>
                                <div className="info-row">
                                    <strong>Current Boxes:</strong> {selectedPayment.boxes_checked}
                                </div>
                                <div className="form-group">
                                    <label>New Total Amount (GHS) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={adjustForm.new_amount}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, new_amount: e.target.value })}
                                        required
                                        placeholder="Enter the new total amount"
                                    />
                                    <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                        {adjustForm.new_amount && parseFloat(adjustForm.new_amount) !== parseFloat(selectedPayment.amount_paid) && (
                                            <>
                                                {parseFloat(adjustForm.new_amount) > parseFloat(selectedPayment.amount_paid)
                                                    ? `✅ Will ADD GHS${(parseFloat(adjustForm.new_amount) - parseFloat(selectedPayment.amount_paid)).toFixed(2)}`
                                                    : `⚠️ Will REMOVE GHS${(parseFloat(selectedPayment.amount_paid) - parseFloat(adjustForm.new_amount)).toFixed(2)}`
                                                }
                                            </>
                                        )}
                                    </small>
                                </div>
                                {customerCard && (
                                    <div className="info-row">
                                        <strong>New Boxes:</strong> {Math.floor(parseFloat(adjustForm.new_amount || 0) / customerCard.box_price)}
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Adjustment Notes</label>
                                    <textarea
                                        value={adjustForm.notes}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                                        placeholder="Reason for adjustment..."
                                        rows="3"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowAdjustModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Adjust Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Time Extension & Overdue Penalty Modal */}
            {showPenaltyModal && (
                <div className="modal-overlay" onClick={() => setShowPenaltyModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h3>⚠️ Time Extension & Overdue Penalty</h3>
                            <button className="close-btn" onClick={() => setShowPenaltyModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleApplyPenalty}>
                            <div className="modal-body">
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '16px' }}>
                                    Extend this card's due date and add extra penalty contribution boxes to the customer's completion requirement.
                                </p>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>New Extended Due Date *</label>
                                    <input
                                        type="date"
                                        name="extended_due_date"
                                        value={penaltyForm.extended_due_date}
                                        onChange={handlePenaltyChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    <small style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                        Current due date: {customerCard.customer?.due_date || 'Not set'}
                                    </small>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div className="form-group">
                                        <label>Penalty Percentage (%)</label>
                                        <input
                                            type="number"
                                            name="percentage"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            value={penaltyForm.percentage}
                                            onChange={handlePenaltyChange}
                                            placeholder="e.g., 10"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Extra Penalty Boxes *</label>
                                        <input
                                            type="number"
                                            name="extra_boxes"
                                            min="1"
                                            value={penaltyForm.extra_boxes}
                                            onChange={handlePenaltyChange}
                                            required
                                            placeholder="e.g., 10"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    padding: '14px 16px',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '13px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span>Current Total Boxes:</span>
                                        <strong>{customerCard.total_boxes} boxes</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span>New Target Boxes:</span>
                                        <strong style={{ color: '#f59e0b' }}>
                                            {(customerCard.total_boxes || 0) + (parseInt(penaltyForm.extra_boxes) || 0)} boxes (+{penaltyForm.extra_boxes || 0})
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Additional Penalty Amount:</span>
                                        <strong style={{ color: '#f59e0b' }}>
                                            GHS {((parseInt(penaltyForm.extra_boxes) || 0) * customerCard.box_price).toFixed(2)}
                                        </strong>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Reason / Notes (Optional)</label>
                                    <textarea
                                        name="notes"
                                        value={penaltyForm.notes}
                                        onChange={handlePenaltyChange}
                                        placeholder="Reason for extension (e.g., Customer requested 30-day extension with 10% penalty)..."
                                        rows="3"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowPenaltyModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={penaltySubmitting} style={{ background: '#f59e0b', color: '#000', fontWeight: 700 }}>
                                    {penaltySubmitting ? 'Applying...' : 'Apply Extension & Penalty'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerBoxTracking;
