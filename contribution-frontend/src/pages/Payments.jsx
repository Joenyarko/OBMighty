import { useState, useEffect } from 'react';
import { paymentAPI, userAPI, branchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/App.css';

function Payments() {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState([]);
    const [branches, setBranches] = useState([]);

    // Filters State
    const [filters, setFilters] = useState({
        date: '',
        worker_id: '',
        branch_id: ''
    });

    useEffect(() => {
        fetchInitialData();
        fetchPayments();
    }, []);

    // Re-fetch when filters change (debouncing could be added, but manual refresh or effect is fine for now)
    useEffect(() => {
        fetchPayments();
    }, [filters]);

    const fetchInitialData = async () => {
        try {
            const [workersRes, branchesRes] = await Promise.all([
                userAPI.getAll(),
                branchAPI.getAll()
            ]);

            // Normalize data (handle if wrapped in .data or not)
            const workerList = Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data?.data || []);
            setWorkers(workerList.filter(u => u.roles?.some(r => r.name === 'worker')));

            const branchList = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []);
            setBranches(branchList);
        } catch (error) {
            console.error('Failed to load filter options', error);
        }
    };

    const fetchPayments = async () => {
        setLoading(true);
        try {
            // Remove empty filters
            const params = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '')
            );

            const response = await paymentAPI.getAll(params);
            setPayments(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch payments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            date: '',
            worker_id: '',
            branch_id: ''
        });
    };

    const isCEO = user?.roles?.some(r => r.name === 'ceo');
    const isSecretary = user?.roles?.some(r => r.name === 'secretary');

    return (
        <div className="payments-page">
            <h1 style={{ color: 'var(--primary-color)', marginBottom: '24px' }}>Payment History</h1>

            {/* Filters Section */}
            <div className="card" style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by Date</label>
                    <input
                        type="date"
                        name="date"
                        value={filters.date}
                        onChange={handleFilterChange}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}
                    />
                </div>

                {/* Worker Filter - Visible to CEO and Secretary (if they have workers) */}
                {/* Worker Filter - Visible if we have workers to filter */}
                {workers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by Worker</label>
                        <select
                            name="worker_id"
                            value={filters.worker_id}
                            onChange={handleFilterChange}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', minWidth: '150px' }}
                        >
                            <option value="">All Workers</option>
                            {workers.map(worker => (
                                <option key={worker.id} value={worker.id}>{worker.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Branch Filter - Only Visible to CEO */}
                {isCEO && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by Branch</label>
                        <select
                            name="branch_id"
                            value={filters.branch_id}
                            onChange={handleFilterChange}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', minWidth: '150px' }}
                        >
                            <option value="">All Branches</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    onClick={clearFilters}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', height: '38px', marginBottom: '1px' }}
                >
                    Clear Filters
                </button>
            </div>

            <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}> {/* Horizontal Scroll Wrapper */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Date</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Customer</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Branch</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Amount</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Boxes</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Worker</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center' }}>Loading payments...</td></tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No payments matches found.
                                    </td>
                                </tr>
                            ) : (
                                payments.map(payment => (
                                    <tr key={payment.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                        <td style={{ padding: '16px', fontWeight: '500', whiteSpace: 'nowrap' }}>{payment.customer?.name}</td>
                                        <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>{payment.branch?.name}</td>
                                        <td style={{ padding: '16px', color: '#4CAF50', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                            +₵{parseFloat(payment.payment_amount).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '16px' }}>{payment.boxes_filled}</td>
                                        <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {payment.worker?.name}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Payments;
