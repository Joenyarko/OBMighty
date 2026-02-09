import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportAPI } from '../services/api';
import '../styles/Dashboard.css';

function Dashboard() {
    const { user, isCEO, isSecretary, isWorker } = useAuth();
    const [dailyData, setDailyData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDailyReport();
    }, []);

    const fetchDailyReport = async () => {
        try {
            const response = await reportAPI.daily();
            setDailyData(response.data);
        } catch (error) {
            console.error('Failed to fetch daily report:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Welcome, {user?.name}</h1>
                <p className="role-badge">{user?.roles?.[0]?.toUpperCase()}</p>
            </div>

            {isWorker() && (
                <WorkerDashboard data={dailyData} />
            )}

            {isSecretary() && (
                <SecretaryDashboard data={dailyData} />
            )}

            {isCEO() && (
                <CEODashboard data={dailyData} />
            )}
        </div>
    );
}

function WorkerDashboard({ data }) {
    const workerTotal = data?.worker_total || {};

    return (
        <div className="dashboard-content">
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Today's Collections</h3>
                    <p className="stat-value">
                        GHS{workerTotal.total_collections || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Customers Paid</h3>
                    <p className="stat-value">
                        {workerTotal.total_customers_paid || 0}
                    </p>
                </div>
            </div>

            <div className="recent-payments">
                <h2>Today's Payments</h2>
                {data?.payments?.length > 0 ? (
                    <div className="payment-list">
                        {data.payments.map((payment) => (
                            <div key={payment.id} className="payment-item">
                                <div>
                                    <strong>{payment.customer?.name}</strong>
                                    <p>GHS{payment.payment_amount}</p>
                                </div>
                                <span className="payment-time">
                                    {new Date(payment.created_at).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-data">No payments recorded today</p>
                )}
            </div>
        </div>
    );
}

function SecretaryDashboard({ data }) {
    const branchTotal = data?.branch_total || {};

    return (
        <div className="dashboard-content">
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Branch Collections</h3>
                    <p className="stat-value">
                        GHS{branchTotal.total_collections || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Total Payments</h3>
                    <p className="stat-value">
                        {branchTotal.total_payments || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Active Workers</h3>
                    <p className="stat-value">
                        {branchTotal.total_workers_active || 0}
                    </p>
                </div>
            </div>

            <div className="worker-performance">
                <h2>Worker Performance</h2>
                {data?.worker_totals?.length > 0 ? (
                    <div className="worker-list">
                        {data.worker_totals.map((wt) => (
                            <div key={wt.id} className="worker-item">
                                <div>
                                    <strong>{wt.worker?.name}</strong>
                                    <p>{wt.total_customers_paid} customers</p>
                                </div>
                                <span className="worker-total">
                                    GHS{wt.total_collections}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-data">No worker activity today</p>
                )}
            </div>
        </div>
    );
}

function CEODashboard({ data }) {
    const companyTotal = data?.company_total || {};

    return (
        <div className="dashboard-content">
            <div className="stats-grid">
                <div className="stat-card highlight">
                    <h3>Company Collections</h3>
                    <p className="stat-value">
                        GHS{companyTotal.total_collections || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Total Payments</h3>
                    <p className="stat-value">
                        {companyTotal.total_payments || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Active Branches</h3>
                    <p className="stat-value">
                        {companyTotal.total_branches_active || 0}
                    </p>
                </div>
            </div>

            <div className="branch-performance">
                <h2>Branch Performance</h2>
                {data?.branch_totals?.length > 0 ? (
                    <div className="branch-list">
                        {data.branch_totals.map((bt) => (
                            <div key={bt.id} className="branch-item">
                                <div>
                                    <strong>{bt.branch?.name}</strong>
                                    <p>{bt.total_payments} payments | {bt.total_workers_active} workers</p>
                                </div>
                                <span className="branch-total">
                                    GHS{bt.total_collections}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-data">No branch activity today</p>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
