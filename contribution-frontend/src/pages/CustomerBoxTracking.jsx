import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import api from '../services/api';
import '../styles/CustomerBoxTracking.css';

const customerCardAPI = {
    getCustomerCard: (customerId) => api.get(`/customer-cards/customer/${customerId}`),
    getBoxStates: (id) => api.get(`/customer-cards/${id}/box-states`),
    checkBoxes: (id, data) => api.post(`/customer-cards/${id}/check-boxes`, data),
    getPaymentHistory: (id) => api.get(`/customer-cards/${id}/payment-history`),
    getDailySales: (id, date) => api.get(`/customer-cards/${id}/daily-sales`, { params: { date } }),
    reversePayment: (paymentId) => api.delete(`/box-payments/${paymentId}`),
    adjustPayment: (paymentId, data) => api.patch(`/box-payments/${paymentId}`, data),
};

function CustomerBoxTracking() {
    const { customerId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [customerCard, setCustomerCard] = useState(null);
    const [boxStates, setBoxStates] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [dailySales, setDailySales] = useState(0);

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

    useEffect(() => {
        fetchData();
    }, [customerId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cardRes, boxStatesRes, historyRes, salesRes] = await Promise.all([
                customerCardAPI.getCustomerCard(customerId),
                customerCardAPI.getCustomerCard(customerId).then(res =>
                    customerCardAPI.getBoxStates(res.data.id)
                ),
                customerCardAPI.getCustomerCard(customerId).then(res =>
                    customerCardAPI.getPaymentHistory(res.data.id)
                ),
                customerCardAPI.getCustomerCard(customerId).then(res =>
                    customerCardAPI.getDailySales(res.data.id, new Date().toISOString().split('T')[0])
                ),
            ]);

            setCustomerCard(cardRes.data);
            setBoxStates(boxStatesRes.data.box_states);
            setPaymentHistory(historyRes.data.data);
            setDailySales(salesRes.data.daily_sales);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to load customer card data');
            navigate('/customers');
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
            </div>

            {/* Customer Details */}
            <div className="customer-details-card">
                <div className="customer-info">
                    <h2>{customerCard.customer.name}</h2>
                    <p>📞 {customerCard.customer.phone}</p>
                    <p>📍 {customerCard.customer.location}</p>
                </div>
                <div className="card-info">
                    <h3>{customerCard.card.card_name}</h3>
                    <span className="card-code">{customerCard.card.card_code}</span>
                </div>
            </div>

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

            {/* Quick Payment Form */}
            <div className="quick-payment-section">
                <h3>💰 Record Payment</h3>
                <form onSubmit={handlePaymentSubmit} className="payment-form">
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
            </div>

            {/* Box Grid */}
            <div className="box-grid-section">
                <h3>📋 Box Template ({customerCard.total_boxes} boxes @ GHS{customerCard.box_price} each)</h3>
                <div className="box-grid">
                    {boxStates.map(box => {
                        // Calculate color based on payment sequence
                        let colorClass = 'unchecked';
                        if (box.is_checked) {
                            if (box.payment_id) {
                                // specific logic to alternate colors based on sorted unique payment IDs
                                const paymentIds = [...new Set(boxStates
                                    .filter(b => b.payment_id)
                                    .map(b => b.payment_id)
                                )].sort((a, b) => a - b);

                                const index = paymentIds.indexOf(box.payment_id);
                                colorClass = index % 2 === 0 ? 'red' : 'blue';
                            } else {
                                colorClass = 'checked'; // Fallback for legacy/manual checks without payment ID
                            }
                        }

                        return (
                            <div
                                key={box.id}
                                className={`box ${colorClass}`}
                                title={box.is_checked ? `Checked on ${box.checked_date}` : 'Unchecked'}
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
        </div>
    );
}

export default CustomerBoxTracking;
