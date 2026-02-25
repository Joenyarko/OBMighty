import { useState, useEffect } from 'react';
// Version: 1.0.1 - CEO Stats
import { useAuth } from '../context/AuthContext';
import { reportAPI } from '../services/api';
import SimpleBarChart from '../components/Charts/SimpleBarChart';
import '../styles/Dashboard.css';

function Dashboard() {
    const { user, isCEO, isSecretary, isWorker } = useAuth();
    const [dailyData, setDailyData] = useState(null);
    const [trendPeriod, setTrendPeriod] = useState('weekly');
    const [trendData, setTrendData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDailyReport();
    }, []);

    useEffect(() => {
        fetchTrendData();
    }, [trendPeriod]);

    const fetchTrendData = async () => {
        try {
            let response;
            if (trendPeriod === 'weekly') {
                response = await reportAPI.weekly();
                setTrendData({
                    label: 'Weekly Collections Trend',
                    items: (response.data.daily_breakdown || []).map(d => ({
                        date: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
                        amount: d.total_collections
                    }))
                });
            } else if (trendPeriod === 'monthly') {
                response = await reportAPI.monthly();
                setTrendData({
                    label: 'Monthly Collections Trend',
                    items: (response.data.daily_breakdown || []).map(d => ({
                        date: new Date(d.date).getDate().toString(),
                        amount: d.total_collections
                    }))
                });
            } else {
                response = await reportAPI.yearly();
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                setTrendData({
                    label: 'Yearly Collections Trend',
                    items: (response.data.monthly_breakdown || []).map(d => ({
                        date: months[parseInt(d.date.split('-')[1]) - 1] || d.date,
                        amount: d.total_collections
                    }))
                });
            }
        } catch (error) {
            console.error('Failed to fetch trend data:', error);
        }
    };

    const fetchDailyReport = async () => {
        try {
            let response;
            if (isCEO) {
                response = await reportAPI.ceoDashboard();
            } else {
                response = await reportAPI.daily();
            }
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

            {/* Trend Chart with period selector */}
            <div className="dashboard-chart-section" style={{ marginBottom: '24px', background: 'var(--card-bg)', padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: 0 }}>
                        {trendData?.label || 'Collections Trend'}
                    </h3>
                    <select
                        value={trendPeriod}
                        onChange={(e) => setTrendPeriod(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '13px' }}
                    >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                {trendData && trendData.items && trendData.items.length > 0 ? (
                    <div style={{ height: '250px' }}>
                        <SimpleBarChart
                            data={trendData.items}
                            xKey="date"
                            yKey="amount"
                            color="var(--primary-color)"
                            height={250}
                        />
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>No data available for this period</p>
                )}
            </div>

            {
                isWorker && (
                    <WorkerDashboard data={dailyData} />
                )
            }

            {
                isSecretary && (
                    <SecretaryDashboard data={dailyData} />
                )
            }

            {
                isCEO && (
                    <CEODashboard data={dailyData} />
                )
            }
        </div >
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
                <div className="stat-card highlight">
                    <h3>Total Customers</h3>
                    <p className="stat-value">
                        {workerTotal.total_customers || 0}
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
                <div className="stat-card highlight">
                    <h3>Total Customers</h3>
                    <p className="stat-value">
                        {branchTotal.total_customers || 0}
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
    const overview = data?.overview || {};

    return (
        <div className="dashboard-content">
            {/* New Overall Metrics for CEO */}
            <div className="stats-grid overall-stats" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <h3>Overall Revenue</h3>
                    <p className="stat-value" style={{ color: '#2ecc71' }}>
                        GHS{overview.overall_revenue || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Overall Expense</h3>
                    <p className="stat-value" style={{ color: '#e74c3c' }}>
                        GHS{overview.overall_expense || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Overall Profit</h3>
                    <p className="stat-value" style={{ color: (overview.overall_profit) >= 0 ? '#2ecc71' : '#e74c3c' }}>
                        GHS{overview.overall_profit ? overview.overall_profit.toFixed(2) : '0.00'}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Total Staff</h3>
                    <p className="stat-value">
                        {overview.total_staff || 0}
                    </p>
                </div>

                <div className="stat-card">
                    <h3>Card Types</h3>
                    <p className="stat-value">
                        {overview.total_card_templates || 0}
                    </p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card highlight">
                    <h3>Today Collections</h3>
                    <p className="stat-value">
                        GHS{overview.today_revenue || 0}
                    </p>
                </div>
                <div className="stat-card highlight" style={{ background: '#2c3e50', color: 'white' }}>
                    <h3 style={{ color: 'white' }}>Total Customers</h3>
                    <p className="stat-value">
                        {overview.total_customers || 0}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Total Profit</h3>
                    <p className="stat-value" style={{ color: (overview.overall_profit) >= 0 ? '#2ecc71' : '#e74c3c' }}>
                        GHS{overview.overall_profit ? overview.overall_profit.toFixed(2) : '0.00'}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Total Branches</h3>
                    <p className="stat-value">
                        {overview.total_branches || 0}
                    </p>
                </div>
            </div>

            {/* Branch Activity - Enhanced */}
            <div className="branch-performance">
                <h2>Branch Activity</h2>
                {data?.performance?.by_branch?.length > 0 ? (
                    <div className="branch-activity-grid">
                        {data.performance.by_branch.map((branch) => (
                            <div key={branch.id} className="branch-activity-card">
                                <div className="bac-header">
                                    <h3>{branch.name}</h3>
                                    <span className="bac-workers">{branch.active_workers} workers</span>
                                </div>
                                <div className="bac-stats">
                                    <div className="bac-stat">
                                        <span className="bac-stat-label">Today</span>
                                        <span className="bac-stat-value today">GHS{parseFloat(branch.today_revenue || 0).toLocaleString()}</span>
                                        <span className="bac-stat-sub">{branch.today_payments || 0} payments</span>
                                    </div>
                                    <div className="bac-stat">
                                        <span className="bac-stat-label">This Week</span>
                                        <span className="bac-stat-value week">GHS{parseFloat(branch.week_revenue || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="bac-stat">
                                        <span className="bac-stat-label">This Month</span>
                                        <span className="bac-stat-value month">GHS{parseFloat(branch.month_revenue || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="bac-footer">
                                    <span>{branch.customers} total customers</span>
                                    <span className="bac-active">{branch.active_customers} active</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    data?.branch_totals?.length > 0 ? (
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
                    )
                )}
            </div>
        </div>
    );
}

export default Dashboard;
