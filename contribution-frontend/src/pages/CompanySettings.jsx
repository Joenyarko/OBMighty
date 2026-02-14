import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { showSuccess, showError } from '../utils/sweetalert';
import { Building, Save, AlertCircle, Palette, Mail, Globe, Zap } from 'lucide-react';
import '../styles/CompanySettings.css';

function CompanySettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [company, setCompany] = useState(null);
    const [stats, setStats] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        card_prefix: '',
        primary_color: '#4F46E5',
        domain: '',
        subdomain: '',
        logo_url: '',
        currency: 'USD',
        timezone: 'UTC',
        payment_methods: ['cash', 'transfer'],
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (user?.role !== 'ceo') {
            showError('Only CEO can access company settings');
            return;
        }
        fetchCompanySettings();
    }, [user]);

    const fetchCompanySettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/company/settings');
            const { company, stats } = response.data;
            
            setCompany(company);
            setStats(stats);
            setFormData({
                name: company.name || '',
                card_prefix: company.card_prefix || '',
                primary_color: company.primary_color || '#4F46E5',
                domain: company.domain || '',
                subdomain: company.subdomain || '',
                logo_url: company.logo_url || '',
                currency: company.currency || 'USD',
                timezone: company.timezone || 'UTC',
                payment_methods: company.payment_methods || ['cash', 'transfer'],
            });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handlePaymentMethodToggle = (method) => {
        setFormData(prev => ({
            ...prev,
            payment_methods: prev.payment_methods.includes(method)
                ? prev.payment_methods.filter(m => m !== method)
                : [...prev.payment_methods, method]
        }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
            showError('Please upload a valid image file (PNG, JPEG, SVG, or WebP)');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('File size must be less than 5MB');
            return;
        }

        try {
            setSaving(true);
            const formDataUpload = new FormData();
            formDataUpload.append('logo', file);

            const response = await api.post('/company/upload-logo', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormData(prev => ({
                ...prev,
                logo_url: response.data.logo_url
            }));
            
            showSuccess('Logo uploaded successfully');
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to upload logo');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setErrors({});

            // Validate card prefix
            if (formData.card_prefix && !/^[A-Z0-9]+$/.test(formData.card_prefix)) {
                setErrors({ card_prefix: 'Card prefix must contain only uppercase letters and numbers' });
                return;
            }

            const response = await api.post('/company/settings', formData);
            setCompany(response.data.company);
            showSuccess(response.data.message);
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showError(error.response?.data?.message || 'Failed to update settings');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-container">
                <div className="loading-spinner">Loading company settings...</div>
            </div>
        );
    }

    return (
        <div className="company-settings-container">
            <div className="settings-header">
                <div className="header-content">
                    <Building size={32} className="header-icon" />
                    <div>
                        <h1>Company Settings</h1>
                        <p className="subtitle">Manage your organization settings and branding</p>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_branches}</div>
                        <div className="stat-label">Branches</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_users}</div>
                        <div className="stat-label">Users</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.total_customers}</div>
                        <div className="stat-label">Customers</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
                    onClick={() => setActiveTab('branding')}
                >
                    <Palette size={18} /> Branding
                </button>
                <button
                    className={`tab-btn ${activeTab === 'integration' ? 'active' : ''}`}
                    onClick={() => setActiveTab('integration')}
                >
                    <Zap size={18} /> Integration
                </button>
            </div>

            {/* Tab Content */}
            <div className="settings-content">
                {/* General Tab */}
                {activeTab === 'general' && (
                    <div className="tab-pane">
                        <div className="section">
                            <h2>Basic Information</h2>
                            
                            <div className="form-group">
                                <label>Company Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter company name"
                                    className={errors.name ? 'input-error' : ''}
                                />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Currency</label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleInputChange}
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="NGN">NGN (₦)</option>
                                        <option value="ZAR">ZAR (R)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Timezone</label>
                                    <select
                                        name="timezone"
                                        value={formData.timezone}
                                        onChange={handleInputChange}
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="Africa/Lagos">Africa/Lagos</option>
                                        <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                                        <option value="America/New_York">America/New_York</option>
                                        <option value="Europe/London">Europe/London</option>
                                        <option value="Asia/Dubai">Asia/Dubai</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Card Prefix</label>
                                <input
                                    type="text"
                                    name="card_prefix"
                                    value={formData.card_prefix}
                                    onChange={handleInputChange}
                                    placeholder="e.g., OBM (uppercase letters and numbers only)"
                                    maxLength="10"
                                    className={errors.card_prefix ? 'input-error' : ''}
                                />
                                {errors.card_prefix && <span className="error-text">{errors.card_prefix}</span>}
                                <small>Used in card numbering (e.g., OBM-001)</small>
                            </div>

                            <div className="form-group">
                                <label>Payment Methods</label>
                                <div className="checkbox-group">
                                    {['cash', 'transfer', 'card', 'check'].map(method => (
                                        <label key={method} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.payment_methods.includes(method)}
                                                onChange={() => handlePaymentMethodToggle(method)}
                                            />
                                            <span className="capitalize">{method}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Branding Tab */}
                {activeTab === 'branding' && (
                    <div className="tab-pane">
                        <div className="section">
                            <h2>Branding</h2>

                            <div className="form-group">
                                <label>Primary Color</label>
                                <div className="color-picker-wrapper">
                                    <input
                                        type="color"
                                        name="primary_color"
                                        value={formData.primary_color}
                                        onChange={handleInputChange}
                                        className="color-picker"
                                    />
                                    <input
                                        type="text"
                                        value={formData.primary_color}
                                        onChange={handleInputChange}
                                        name="primary_color"
                                        placeholder="#4F46E5"
                                        className="color-input"
                                    />
                                </div>
                                <small>This color will be used throughout the application</small>
                            </div>

                            <div className="form-group">
                                <label>Company Logo</label>
                                <div className="logo-upload-section">
                                    <div className="logo-upload-input">
                                        <input
                                            type="file"
                                            id="logo-file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            disabled={saving}
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            className="nex-btn-secondary"
                                            onClick={() => document.getElementById('logo-file').click()}
                                            disabled={saving}
                                        >
                                            {saving ? 'Uploading...' : 'Upload Logo'}
                                        </button>
                                        <small>PNG, JPEG, SVG, or WebP (max 5MB)</small>
                                    </div>

                                    {formData.logo_url && (
                                        <div className="logo-preview">
                                            <img src={formData.logo_url} alt="Logo preview" />
                                            <p>Current Logo</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="color-preview" style={{ backgroundColor: formData.primary_color }}>
                                <p>Preview of your primary color</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Integration Tab */}
                {activeTab === 'integration' && (
                    <div className="tab-pane">
                        <div className="section">
                            <h2>Domain Configuration</h2>

                            <div className="form-group">
                                <label>Domain</label>
                                <input
                                    type="text"
                                    name="domain"
                                    value={formData.domain}
                                    onChange={handleInputChange}
                                    placeholder="example.com"
                                    className={errors.domain ? 'input-error' : ''}
                                />
                                {errors.domain && <span className="error-text">{errors.domain}</span>}
                            </div>

                            <div className="form-group">
                                <label>Subdomain</label>
                                <input
                                    type="text"
                                    name="subdomain"
                                    value={formData.subdomain}
                                    onChange={handleInputChange}
                                    placeholder="company-name"
                                    className={errors.subdomain ? 'input-error' : ''}
                                />
                                {errors.subdomain && <span className="error-text">{errors.subdomain}</span>}
                                <small>Will be accessible at subdomain.example.com</small>
                            </div>

                            <div className="info-box">
                                <AlertCircle size={18} />
                                <p>DNS configuration must be updated manually for custom domains to work</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="settings-actions">
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={fetchCompanySettings}
                    disabled={saving}
                >
                    Reset
                </button>
            </div>
        </div>
    );
}

export default CompanySettings;
