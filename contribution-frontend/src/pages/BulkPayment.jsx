import { useState, useEffect } from 'react';
import { userAPI, paymentAPI, customerAPI } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css'; // Ensure global styles are available

function BulkPayment() {
    const { user } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState({}); // { customerId: amount }
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, last_page: 1 });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(page, searchTerm);
        }, 500); // Debounce search

        return () => clearTimeout(timer);
    }, [page, searchTerm]);

    const fetchCustomers = async (currentPage, search) => {
        try {
            setLoading(true);
            const response = await customerAPI.getAll({
                status: 'in_progress',
                page: currentPage,
                search: search,
                per_page: 50 // Show more per page for bulk
            });
            const data = response.data.data || response.data;
            setCustomers(Array.isArray(data) ? data : []);
            setPagination({
                total: response.data.total,
                last_page: response.data.last_page
            });
        } catch (error) {
            console.error('Failed to fetch customers', error);
            showError('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (customerId, amount) => {
        setPayments(prev => ({
            ...prev,
            [customerId]: amount
        }));
    };

    const handleSaveAll = async () => {
        const entriesToSave = Object.entries(payments)
            .filter(([_, amount]) => amount && parseFloat(amount) > 0)
            .map(([customerId, amount]) => ({
                customer_id: customerId,
                payment_amount: parseFloat(amount),
                payment_date: new Date().toISOString().split('T')[0], // Today
                payment_method: 'cash' // Default to cash for bulk
            }));

        if (entriesToSave.length === 0) {
            showError('No payments entered');
            return;
        }

        const confirm = await showConfirm(
            `Are you sure you want to record ${entriesToSave.length} payments?`,
            'Confirm Bulk Entry'
        );

        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        try {
            const response = await paymentAPI.bulkCreate({ payments: entriesToSave });

            const { successful, failed } = response.data.results;

            if (failed.length > 0) {
                showError(`Saved ${successful.length} payments. ${failed.length} failed.`);
                console.error('Failed payments:', failed);
            } else {
                showSuccess(`Successfully recorded ${successful.length} payments!`);
            }

            // Reset form and refresh
            setPayments({});
            fetchCustomers(page, searchTerm);

        } catch (error) {
            console.error('Bulk save failed', error);
            showError('Failed to save payments');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to first page on search
    };

    if (loading) return <div className="loading">Loading customers...</div>;

    return (
        <div className="bulk-payment-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>Bulk Payment Entry</h1>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                    />
                    <button
                        className="btn-primary"
                        onClick={handleSaveAll}
                        disabled={submitting || Object.keys(payments).length === 0}
                    >
                        {submitting ? 'Saving...' : 'Save All Payments'}
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'rgba(0,0,0,0.2)' }}>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Customer</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Card / Box Price</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Progress</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Balance (GHS)</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Payment (GHS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontWeight: '600' }}>{customer.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{customer.location}</div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div>{customer.card?.card_name || 'N/A'}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--primary-color)' }}>
                                        GHS {customer.price_per_box} / box
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', width: '100px' }}>
                                            <div style={{
                                                width: `${(customer.boxes_filled / customer.total_boxes) * 100}%`,
                                                background: 'var(--primary-color)',
                                                height: '100%',
                                                borderRadius: '4px'
                                            }}></div>
                                        </div>
                                        <span style={{ fontSize: '12px' }}>{Math.round(customer.boxes_filled)}/{customer.total_boxes}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px', fontWeight: 'bold' }}>
                                    {customer.balance?.toFixed(2)}
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={payments[customer.id] || ''}
                                        onChange={(e) => handleAmountChange(customer.id, e.target.value)}
                                        style={{
                                            padding: '8px',
                                            width: '120px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: payments[customer.id] ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                            color: 'var(--text-primary)',
                                            borderColor: payments[customer.id] ? 'var(--primary-color)' : 'var(--border-color)'
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No customers found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination.last_page > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '24px', padding: '10px' }}>
                    <button
                        className="btn-secondary"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Page <strong>{page}</strong> of {pagination.last_page}
                        <span style={{ marginLeft: '10px' }}>({pagination.total} total customers)</span>
                    </span>
                    <button
                        className="btn-secondary"
                        disabled={page >= pagination.last_page}
                        onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

export default BulkPayment;
