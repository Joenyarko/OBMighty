import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Sales.css';

// API service for sales
const salesAPI = {
    getWorkerSales: async (period = 'today') => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/sales?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch sales');
        return response.json();
    },

    getWorkerDetails: async (workerId, period = 'today') => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/${workerId}?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch worker details');
        return response.json();
    },
};

function Sales() {
    const [workers, setWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workerDetails, setWorkerDetails] = useState(null);
    const [period, setPeriod] = useState('today');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchWorkerSales();
    }, [period]);

    useEffect(() => {
        if (selectedWorker) {
            fetchWorkerDetails(selectedWorker.id);
        }
    }, [selectedWorker, period]);

    const fetchWorkerSales = async () => {
        try {
            setLoading(true);
            const data = await salesAPI.getWorkerSales(period);
            setWorkers(data.workers);

            // Auto-select first worker if user is branch manager/secretary
            if (user.role !== 'worker' && data.workers.length > 0 && !selectedWorker) {
                setSelectedWorker(data.workers[0]);
            }

            // Auto-select self if user is worker
            if (user.role === 'worker' && data.workers.length > 0) {
                setSelectedWorker(data.workers[0]);
            }
        } catch (error) {
            console.error('Failed to fetch worker sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkerDetails = async (workerId) => {
        try {
            const data = await salesAPI.getWorkerDetails(workerId, period);
            setWorkerDetails(data);
        } catch (error) {
            console.error('Failed to fetch worker details:', error);
        }
    };

    if (loading) {
        return <div className="loading">Loading sales data...</div>;
    }

    return (
        <div className="sales-page">
            <div className="page-header">
                <h1>Sales</h1>
                <div className="period-selector">
                    <button
                        className={period === 'today' ? 'active' : ''}
                        onClick={() => setPeriod('today')}
                    >
                        Today
                    </button>
                    <button
                        className={period === 'week' ? 'active' : ''}
                        onClick={() => setPeriod('week')}
                    >
                        This Week
                    </button>
                    <button
                        className={period === 'month' ? 'active' : ''}
                        onClick={() => setPeriod('month')}
                    >
                        This Month
                    </button>
                </div>
            </div>

            <div className="sales-content">
                {/* Worker List - Only show for branch managers/secretaries */}
                {user.role !== 'worker' && (
                    <div className="workers-list">
                        <h2>Workers</h2>
                        {workers.map((worker) => (
                            <div
                                key={worker.id}
                                className={`worker-card ${selectedWorker?.id === worker.id ? 'active' : ''}`}
                                onClick={() => setSelectedWorker(worker)}
                            >
                                <div className="worker-info">
                                    <h3>{worker.name}</h3>
                                    <p className="worker-email">{worker.email}</p>
                                </div>
                                <div className="worker-stats">
                                    <div className="stat">
                                        <span className="stat-label">Sales</span>
                                        <span className="stat-value">GHS{parseFloat(worker.total_sales).toFixed(2)}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">Customers</span>
                                        <span className="stat-value">{worker.customers_paid}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Worker Details */}
                {selectedWorker && workerDetails && (
                    <div className="worker-details">
                        <div className="details-header">
                            <div>
                                <h2>{workerDetails.worker.name}'s Sales</h2>
                                <p className="period-info">
                                    {period === 'today' && 'Today'}
                                    {period === 'week' && 'This Week'}
                                    {period === 'month' && 'This Month'}
                                </p>
                            </div>
                            <button
                                className="btn-primary"
                                onClick={() => window.location.href = `/performance/${selectedWorker.id}`}
                                style={{ padding: '10px 20px', fontSize: '14px' }}
                            >
                                🏆 View Performance
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="summary-cards">
                            <div className="summary-card">
                                <div className="card-icon">💰</div>
                                <div className="card-content">
                                    <h3>Total Sales</h3>
                                    <p className="card-value">GHS{parseFloat(workerDetails.summary.total_sales).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon">👥</div>
                                <div className="card-content">
                                    <h3>Customers Paid</h3>
                                    <p className="card-value">{workerDetails.summary.customers_paid}</p>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon">📊</div>
                                <div className="card-content">
                                    <h3>Transactions</h3>
                                    <p className="card-value">{workerDetails.summary.total_transactions}</p>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon">📈</div>
                                <div className="card-content">
                                    <h3>Avg Transaction</h3>
                                    <p className="card-value">GHS{parseFloat(workerDetails.summary.average_transaction).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="payment-history">
                            <h3>Payment History</h3>
                            {workerDetails.payments.length === 0 ? (
                                <p className="no-data">No payments recorded for this period.</p>
                            ) : (
                                <div className="table-container">
                                    <table className="mobile-card-view">
                                        <thead>
                                            <tr>
                                                <th>Customer</th>
                                                <th>Phone</th>
                                                <th>Amount</th>
                                                <th>Boxes</th>
                                                <th>Method</th>
                                                <th>Date</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {workerDetails.payments.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td data-label="Customer">{payment.customer_name}</td>
                                                    <td data-label="Phone">{payment.customer_phone}</td>
                                                    <td data-label="Amount" className="amount">GHS{parseFloat(payment.amount).toFixed(2)}</td>
                                                    <td data-label="Boxes">{payment.boxes_filled}</td>
                                                    <td data-label="Method">
                                                        <span className={`payment-method ${payment.payment_method}`}>
                                                            {payment.payment_method.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td data-label="Date">{payment.payment_date}</td>
                                                    <td data-label="Time">{payment.payment_time}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Sales;
