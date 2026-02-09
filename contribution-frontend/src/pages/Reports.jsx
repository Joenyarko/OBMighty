import { useState, useEffect } from 'react';
import { accountingAPI } from '../services/api';
import Layout from '../components/Layout';
import '../styles/App.css';

function Reports() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            const response = await accountingAPI.getSummary();
            setSummary(response.data);
        } catch (error) {
            console.error('Failed to fetch summary', error);
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

            <div className="card" style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
                <h3>Visual Charts Coming Soon</h3>
                <p>We are integrating advanced charts to visualize your daily trends.</p>
            </div>
        </div>
    );
}

export default Reports;
