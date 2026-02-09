import { useState, useEffect } from 'react';
import { paymentAPI } from '../services/api';
import Layout from '../components/Layout';
import '../styles/App.css';

function Payments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await paymentAPI.getAll();
            setPayments(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch payments', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="payments-page">
            <h1 style={{ color: 'var(--primary-color)', marginBottom: '24px' }}>Payment History</h1>

            <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Date</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Customer</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Branch</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Amount</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Boxes</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Worker</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No payments recorded yet.
                                </td>
                            </tr>
                        ) : (
                            payments.map(payment => (
                                <tr key={payment.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '16px' }}>{payment.payment_date}</td>
                                    <td style={{ padding: '16px', fontWeight: '500' }}>{payment.customer?.name}</td>
                                    <td style={{ padding: '16px' }}>{payment.branch?.name}</td>
                                    <td style={{ padding: '16px', color: '#4CAF50', fontWeight: 'bold' }}>
                                        +₵{parseFloat(payment.payment_amount).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '16px' }}>{payment.boxes_filled}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {payment.worker?.name}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Payments;
