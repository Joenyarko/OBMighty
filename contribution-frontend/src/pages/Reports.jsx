import { useState, useEffect } from 'react';
import { accountingAPI, reportAPI } from '../services/api'; // Assuming reportAPI exists and has methods
import Layout from '../components/Layout';
import SimpleBarChart from '../components/Charts/SimpleBarChart';
import SimpleLineChart from '../components/Charts/SimpleLineChart';
import '../styles/App.css';

function Reports() {
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [summaryRes, trendRes] = await Promise.all([
                accountingAPI.getSummary(),
                // For now, let's assume we can get some trend data. 
                // If not, we'll mock it or add an endpoint.
                // Let's try to get daily reports or something similar.
                // Actually, let's use a mock for now if endpoint isn't ready.
                // Or better, let's just use what we have.
                accountingAPI.getLedger({ account_type: 'income', start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] })
            ]);

            setSummary(summaryRes.data);

            // Process ledger for trends (group by date)
            const ledgerData = trendRes.data.data;
            const grouped = ledgerData.reduce((acc, curr) => {
                const date = curr.entry_date.split('T')[0];
                if (!acc[date]) acc[date] = 0;
                acc[date] += parseFloat(curr.credit);
                return acc;
            }, {});

            const trendData = Object.keys(grouped).sort().map(date => ({
                date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                amount: grouped[date]
            }));

            setTrends(trendData);

        } catch (error) {
            console.error('Failed to fetch report data', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reports-page">
            <h1 style={{ color: 'var(--primary-color)', marginBottom: '24px' }}>Reports & Analytics</h1>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Income</h3>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                        ₵{summary?.total_income?.toLocaleString() || '0.00'}
                    </div>
                </div>

                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Expenses</h3>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF4444' }}>
                        ₵{summary?.total_expenses?.toLocaleString() || '0.00'}
                    </div>
                </div>

                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Net Profit</h3>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        ₵{summary?.net_profit?.toLocaleString() || '0.00'}
                    </div>
                </div>
            </div>

            <div className="charts-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Income Trend (Last 30 Days)</h3>
                    <div style={{ padding: '10px' }}>
                        <SimpleLineChart data={trends} xKey="date" yKey="amount" color="#4caf50" height={250} />
                    </div>
                </div>

                <div className="card" style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Income Overview</h3>
                    <div style={{ padding: '10px' }}>
                        <SimpleBarChart data={trends.slice(-7)} xKey="date" yKey="amount" color="#2196f3" height={250} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Reports;
