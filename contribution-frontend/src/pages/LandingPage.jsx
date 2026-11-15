import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Shield,
    ShieldCheck,
    Lock,
    CheckCircle2,
    BarChart3,
    Layers,
    Building2,
    Users,
    CreditCard,
    ArrowRight,
    ChevronRight,
    Star,
    Sparkles,
    Clock,
    Smartphone,
    Receipt,
    Coins,
    Briefcase,
    Menu,
    X,
    ExternalLink,
    Send,
    MessageSquare,
    Check,
    Zap,
    TrendingUp,
    Boxes,
    FileSpreadsheet,
    QrCode,
    RefreshCw
} from 'lucide-react';
import '../styles/LandingPage.css';

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [demoForm, setDemoForm] = useState({
        name: '',
        company: '',
        phone: '',
        email: '',
        branches: '1',
        message: ''
    });
    const [formSubmitted, setFormSubmitted] = useState(false);

    useEffect(() => {
        document.body.classList.add('lp-landing-active');
        const origBg = document.body.style.backgroundColor;
        document.body.style.backgroundColor = '#FFFFFF';
        return () => {
            document.body.classList.remove('lp-landing-active');
            document.body.style.backgroundColor = origBg;
        };
    }, []);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setFormSubmitted(true);
        // Optional: construct WhatsApp message link for direct reachout
        const text = encodeURIComponent(
            `Hello Neziz Team! I would like to request a demo of Neziz Cloud ERP.\n\nName: ${demoForm.name}\nCompany: ${demoForm.company}\nPhone: ${demoForm.phone}\nEmail: ${demoForm.email}\nBranches: ${demoForm.branches}\nMessage: ${demoForm.message}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="lp-wrapper">
            {/* Ambient Background Glows */}
            <div className="lp-ambient-glow lp-glow-1"></div>
            <div className="lp-ambient-glow lp-glow-2"></div>
            <div className="lp-ambient-glow lp-glow-3"></div>

            {/* Sticky Header */}
            <header className="lp-header">
                <div className="lp-nav-container">
                    <Link to="/" className="lp-brand">
                        <img
                            src="/Neziz-logo2.png"
                            alt="Neziz"
                            className="lp-brand-logo"
                            onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                        />
                        <div className="lp-brand-text">
                            <span className="lp-brand-name">Neziz</span>
                            <span className="lp-brand-tag">Cloud ERP</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <nav className={`lp-nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                        <a
                            href="#solutions"
                            className="lp-nav-link"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Solutions
                        </a>
                        <a
                            href="#modules"
                            className="lp-nav-link"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            ERP Modules
                        </a>
                        <a
                            href="#passbook"
                            className="lp-nav-link"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Digital Passbook
                        </a>
                        <a
                            href="#pricing"
                            className="lp-nav-link"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Pricing
                        </a>
                        <a
                            href="#contact"
                            className="lp-nav-link"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Contact
                        </a>

                        {mobileMenuOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <Link
                                    to="/login"
                                    className="lp-btn lp-btn-outline"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Client Sign In
                                </Link>
                                <a
                                    href="#contact"
                                    className="lp-btn lp-btn-primary"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Book a Demo
                                </a>
                            </div>
                        )}
                    </nav>

                    {/* Desktop CTA actions */}
                    <div className="lp-nav-actions">
                        <Link to="/login" className="lp-btn lp-btn-outline">
                            Sign In
                        </Link>
                        <a href="#contact" className="lp-btn lp-btn-primary">
                            Request Demo
                        </a>
                        <button
                            className="lp-mobile-toggle"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="lp-hero-section">
                <div className="lp-hero-grid">
                    <div className="lp-hero-content">
                        <div className="lp-announcement-pill">
                            <span className="lp-pill-badge">Cloud ERP</span>
                            <span>Multi-Tenant Financial & Operations Suite</span>
                        </div>

                        <h1 className="lp-hero-title">
                            Automate Your <span className="lp-gold-text">Contributions, Branches & ERP</span> with Precision.
                        </h1>

                        <p className="lp-hero-desc">
                            The cloud-native ERP designed for microfinance institutions, susu enterprises, retail chains, and cooperatives. Complete with real-time field collections, customer digital passbooks, automated payroll, multi-branch inventory, and end-of-day reconciliation.
                        </p>

                        <div className="lp-hero-cta">
                            <a href="#contact" className="lp-btn lp-btn-primary lp-btn-lg">
                                Schedule Free Demo <ArrowRight size={18} />
                            </a>
                            <a href="#modules" className="lp-btn lp-btn-outline lp-btn-lg">
                                Explore Capabilities
                            </a>
                        </div>

                        <div className="lp-hero-trust">
                            <div className="lp-trust-item">
                                <span className="lp-trust-value">100%</span>
                                <span className="lp-trust-label">Reconciled Cash</span>
                            </div>
                            <div className="lp-trust-item">
                                <span className="lp-trust-value">Zero</span>
                                <span className="lp-trust-label">Paperwork Errors</span>
                            </div>
                            <div className="lp-trust-item">
                                <span className="lp-trust-value">Multi-Tenant</span>
                                <span className="lp-trust-label">Isolated Domains</span>
                            </div>
                            <div className="lp-trust-item">
                                <span className="lp-trust-value">24/7 PWA</span>
                                <span className="lp-trust-label">Offline-Resilient</span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Mockup / Metric Card */}
                    <div className="lp-hero-visual">
                        <div className="lp-preview-card">
                            <div className="lp-preview-header">
                                <div className="lp-preview-badge">
                                    <span className="lp-pulse-dot"></span>
                                    <span>Neziz Enterprise Cockpit</span>
                                </div>
                                <span className="lp-brand-tag">Live System</span>
                            </div>

                            <div className="lp-preview-metrics">
                                <div className="lp-metric-box">
                                    <span className="lp-metric-title">Today's Collections</span>
                                    <span className="lp-metric-amount">GHS 52,480.00</span>
                                    <span className="lp-metric-status">
                                        <TrendingUp size={12} /> +18.4% vs last week
                                    </span>
                                </div>
                                <div className="lp-metric-box">
                                    <span className="lp-metric-title">Active Smart Cards</span>
                                    <span className="lp-metric-amount">1,482</span>
                                    <span className="lp-metric-status">
                                        <CheckCircle2 size={12} /> 100% Validated
                                    </span>
                                </div>
                            </div>

                            <div className="lp-preview-branches">
                                <div className="lp-branches-header">
                                    <span>Branch Financial Summary</span>
                                    <span>Reconciliation</span>
                                </div>
                                <div className="lp-branch-row">
                                    <span className="lp-branch-name">
                                        <Building2 size={14} color="#B45309" /> Accra Central Branch
                                    </span>
                                    <span className="lp-branch-val">GHS 24,150.00</span>
                                </div>
                                <div className="lp-branch-row">
                                    <span className="lp-branch-name">
                                        <Building2 size={14} color="#B45309" /> Kumasi Regional Hub
                                    </span>
                                    <span className="lp-branch-val">GHS 18,920.00</span>
                                </div>
                                <div className="lp-branch-row">
                                    <span className="lp-branch-name">
                                        <Building2 size={14} color="#B45309" /> Takoradi Market Branch
                                    </span>
                                    <span className="lp-branch-val">GHS 9,410.00</span>
                                </div>
                            </div>

                            <div className="lp-floating-badge">
                                <div className="lp-badge-icon">
                                    <QrCode size={18} />
                                </div>
                                <div>
                                    <div className="lp-badge-text">Digital Customer Passbook</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)' }}>Instant balance check via QR</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Target Industries Section */}
            <section id="solutions" className="lp-section lp-section-alt">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Tailored Solutions</span>
                    <h2 className="lp-section-title">Built for Modern Financial & Retail Enterprises</h2>
                    <p className="lp-section-subtitle">
                        From daily community contributions to multi-store retail chains, Neziz Cloud delivers end-to-end operational visibility.
                    </p>
                </div>

                <div className="lp-solutions-grid">
                    <div className="lp-solution-card">
                        <div className="lp-solution-icon">
                            <Coins size={28} />
                        </div>
                        <h3 className="lp-solution-title">Microfinance & Susu</h3>
                        <p className="lp-solution-desc">
                            Automate field agent collections, smart cards, daily box tracking, and commission calculations without manual books.
                        </p>
                        <ul className="lp-solution-bullets">
                            <li><Check size={14} className="lp-bullet-check" /> Fixed & Flexible Cards</li>
                            <li><Check size={14} className="lp-bullet-check" /> Collector Box Audit</li>
                            <li><Check size={14} className="lp-bullet-check" /> Instant SMS & Passbook</li>
                        </ul>
                    </div>

                    <div className="lp-solution-card">
                        <div className="lp-solution-icon">
                            <Building2 size={28} />
                        </div>
                        <h3 className="lp-solution-title">Multi-Branch Groups</h3>
                        <p className="lp-solution-desc">
                            Consolidate multiple branches under a single central cockpit while granting managers branch-specific permissions.
                        </p>
                        <ul className="lp-solution-bullets">
                            <li><Check size={14} className="lp-bullet-check" /> Dedicated Subdomains</li>
                            <li><Check size={14} className="lp-bullet-check" /> Inter-Branch Transfers</li>
                            <li><Check size={14} className="lp-bullet-check" /> Central Performance Matrix</li>
                        </ul>
                    </div>

                    <div className="lp-solution-card">
                        <div className="lp-solution-icon">
                            <Boxes size={28} />
                        </div>
                        <h3 className="lp-solution-title">Retail, Stock & POS</h3>
                        <p className="lp-solution-desc">
                            Real-time stock valuation, inventory movements, point-of-sale checkout, and profit margin analytics per product.
                        </p>
                        <ul className="lp-solution-bullets">
                            <li><Check size={14} className="lp-bullet-check" /> Low-Stock Warnings</li>
                            <li><Check size={14} className="lp-bullet-check" /> Instant Receipt Generation</li>
                            <li><Check size={14} className="lp-bullet-check" /> Sales Ledger Integration</li>
                        </ul>
                    </div>

                    <div className="lp-solution-card">
                        <div className="lp-solution-icon">
                            <Briefcase size={28} />
                        </div>
                        <h3 className="lp-solution-title">Savings Cooperatives</h3>
                        <p className="lp-solution-desc">
                            Safeguard member funds with tamper-proof transaction logs, member ledgers, surplus management, and audits.
                        </p>
                        <ul className="lp-solution-bullets">
                            <li><Check size={14} className="lp-bullet-check" /> Member Digital ID</li>
                            <li><Check size={14} className="lp-bullet-check" /> Surplus & Dividend Tracking</li>
                            <li><Check size={14} className="lp-bullet-check" /> Full Audit Trail Logs</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Core ERP Modules */}
            <section id="modules" className="lp-section" style={{ paddingTop: '0' }}>
                <div className="lp-section-header">
                    <span className="lp-section-tag">Enterprise Architecture</span>
                    <h2 className="lp-section-title">The Complete Neziz Cloud ERP Suite</h2>
                    <p className="lp-section-subtitle">
                        Every tool your managers, accountants, and field agents need to drive growth and eliminate revenue leaks.
                    </p>
                </div>

                <div className="lp-modules-grid">
                    {/* Module 1 */}
                    <div className="lp-module-card">
                        <div className="lp-module-header">
                            <div className="lp-module-icon-wrap">
                                <CreditCard size={24} />
                            </div>
                            <span className="lp-module-number">01</span>
                        </div>
                        <h3 className="lp-module-title">Daily Contributions & Cards</h3>
                        <p className="lp-module-desc">
                            Issue smart savings cards with customizable duration, denominations, and customer limits. Record daily payments with one-click bulk entry.
                        </p>
                        <div className="lp-module-features">
                            <span className="lp-feature-chip">Card Serialization</span>
                            <span className="lp-feature-chip">Bulk Daily Entry</span>
                            <span className="lp-feature-chip">Card Status Lifecycle</span>
                        </div>
                    </div>

                    {/* Module 2 */}
                    <div className="lp-module-card">
                        <div className="lp-module-header">
                            <div className="lp-module-icon-wrap">
                                <QrCode size={24} />
                            </div>
                            <span className="lp-module-number">02</span>
                        </div>
                        <h3 className="lp-module-title">Customer Digital Passbook</h3>
                        <p className="lp-module-desc">
                            Give your customers instant 24/7 access to their contributions via a secure, unguessable link or QR passbook. Zero app installation required.
                        </p>
                        <div className="lp-module-features">
                            <span className="lp-feature-chip">QR Code Verification</span>
                            <span className="lp-feature-chip">Mobile Web Access</span>
                            <span className="lp-feature-chip">Anti-Fraud Validation</span>
                        </div>
                    </div>

                    {/* Module 3 */}
                    <div className="lp-module-card">
                        <div className="lp-module-header">
                            <div className="lp-module-icon-wrap">
                                <Clock size={24} />
                            </div>
                            <span className="lp-module-number">03</span>
                        </div>
                        <h3 className="lp-module-title">Close of Day & Reconciliation</h3>
                        <p className="lp-module-desc">
                            Eliminate end-of-day headaches. Match physical cash brought in by collectors against digital receipts with automated surplus and shortage detection.
                        </p>
                        <div className="lp-module-features">
                            <span className="lp-feature-chip">Cash Reconciliation</span>
                            <span className="lp-feature-chip">Discrepancy Audit</span>
                            <span className="lp-feature-chip">Manager Sign-off</span>
                        </div>
                    </div>

                    {/* Module 4 */}
                    <div className="lp-module-card">
                        <div className="lp-module-header">
                            <div className="lp-module-icon-wrap">
                                <Boxes size={24} />
                            </div>
                            <span className="lp-module-number">04</span>
                        </div>
                        <h3 className="lp-module-title">Inventory & Point of Sale</h3>
                        <p className="lp-module-desc">
                            Manage physical products, monitor warehouse quantities across branches, record sales transactions, and prevent stock shrinkage.
                        </p>
                        <div className="lp-module-features">
                            <span className="lp-feature-chip">Branch Stock Transfer</span>
                            <span className="lp-feature-chip">Barcode / SKU</span>
                            <span className="lp-feature-chip">Profit Margins</span>
                        </div>
                    </div>

                    {/* Module 5 */}
                    <div className="lp-module-card">
                        <div className="lp-module-header">
                            <div className="lp-module-icon-wrap">
                                <Users size={24} />
                            </div>
                            <span className="lp-module-number">05</span>
                        </div>
                        <h3 className="lp-module-title">Payroll & Field Commissions</h3>
                        <p className="lp-module-desc">
                            Automate monthly salary and collector commission schedules based on performance, attendance, targets, and collections.
                        </p>
                        <div className="lp-module-features">
                            <span className="lp-feature-chip">Dynamic Commission</span>
                            <span className="lp-feature-chip">PDF Payslips</span>
                            <span className="lp-feature-chip">Worker Performance</span>
                        </div>
                    </div>

                    {/* Module 6 */}
                    <div className="lp-module-card">
                        <div className="lp-module-header">
                            <div className="lp-module-icon-wrap">
                                <BarChart3 size={24} />
                            </div>
                            <span className="lp-module-number">06</span>
                        </div>
                        <h3 className="lp-module-title">Financial Accounting & Reports</h3>
                        <p className="lp-module-desc">
                            Real-time income, expense journals, balance sheets, branch comparison charts, and one-click PDF & Excel report downloads.
                        </p>
                        <div className="lp-module-features">
                            <span className="lp-feature-chip">Cash Flow Ledger</span>
                            <span className="lp-feature-chip">Custom Date Filters</span>
                            <span className="lp-feature-chip">Audit Trails</span>
                        </div>
                    </div>
                </div>

                {/* Digital Passbook Spotlight Section */}
                <div id="passbook" className="lp-spotlight-box">
                    <div className="lp-spotlight-content">
                        <span className="lp-section-tag">Exclusive Technology</span>
                        <h3 className="lp-spotlight-title">Customer Digital Passbook & QR Verification</h3>
                        <p className="lp-spotlight-desc">
                            Never worry about lost paper passbooks or customer disputes again. Neziz Cloud gives each customer a dedicated, live digital passbook accessible right on their smartphone.
                        </p>
                        <div className="lp-spotlight-list">
                            <div className="lp-spotlight-item">
                                <div className="lp-spotlight-check"><Check size={14} /></div>
                                <div>
                                    <strong style={{ color: 'var(--lp-text-primary)' }}>No app download required:</strong> Works directly in any mobile web browser.
                                </div>
                            </div>
                            <div className="lp-spotlight-item">
                                <div className="lp-spotlight-check"><Check size={14} /></div>
                                <div>
                                    <strong style={{ color: 'var(--lp-text-primary)' }}>Real-time balance updates:</strong> As soon as a field agent logs a collection, the customer sees it.
                                </div>
                            </div>
                            <div className="lp-spotlight-item">
                                <div className="lp-spotlight-check"><Check size={14} /></div>
                                <div>
                                    <strong style={{ color: 'var(--lp-text-primary)' }}>Bank-grade token security:</strong> Private cryptographic tokens protect customer data.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lp-spotlight-preview">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Smartphone size={20} color="#B45309" />
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--lp-text-primary)' }}>Customer Mobile View</span>
                            </div>
                            <span className="lp-pill-badge">Verified Passbook</span>
                        </div>
                        <div style={{ background: '#FFFFFF', borderRadius: '0px', padding: '18px', border: '1px solid var(--lp-border)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)' }}>Customer Account</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--lp-text-primary)', marginBottom: '12px' }}>
                                Kwame Mensah &bull; #NZ-4091
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--lp-border)' }}>
                                <span style={{ color: 'var(--lp-text-muted)', fontSize: '0.85rem' }}>Total Saved:</span>
                                <span style={{ color: '#B45309', fontWeight: 700 }}>GHS 3,850.00</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--lp-border)' }}>
                                <span style={{ color: 'var(--lp-text-muted)', fontSize: '0.85rem' }}>Current Card (31-Day):</span>
                                <span style={{ color: '#059669', fontWeight: 700 }}>Day 22 / 31 (Active)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--lp-border)' }}>
                                <span style={{ color: 'var(--lp-text-muted)', fontSize: '0.85rem' }}>Last Recorded Deposit:</span>
                                <span style={{ color: 'var(--lp-text-primary)', fontSize: '0.85rem' }}>Today at 10:42 AM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="lp-section lp-section-alt">
                <div className="lp-section-header">
                    <span className="lp-section-tag">Flexible Subscriptions</span>
                    <h2 className="lp-section-title">Scalable Plans for Any Organization Size</h2>
                    <p className="lp-section-subtitle">
                        Transparent pricing with no hidden fees. Upgrade or scale your branches anytime as your company expands.
                    </p>
                </div>

                <div className="lp-pricing-grid">
                    {/* Starter */}
                    <div className="lp-price-card">
                        <div>
                            <div className="lp-price-tier">Starter Plan</div>
                            <p className="lp-price-desc">Ideal for single-branch microfinance or growing daily contribution firms.</p>
                        </div>
                        <div className="lp-price-val">
                            <span className="lp-price-amount">Contact Us</span>
                            <span className="lp-price-period">/ flexible</span>
                        </div>
                        <ul className="lp-price-features">
                            <li><Check size={16} color="#D4AF37" /> 1 Operational Branch</li>
                            <li><Check size={16} color="#D4AF37" /> Up to 5 Field Agents & Cashiers</li>
                            <li><Check size={16} color="#D4AF37" /> Daily Contribution & Cards</li>
                            <li><Check size={16} color="#D4AF37" /> Close of Day Cash Audit</li>
                            <li><Check size={16} color="#D4AF37" /> Customer Digital Passbook</li>
                            <li><Check size={16} color="#D4AF37" /> Standard Cloud Hosting</li>
                        </ul>
                        <a href="#contact" className="lp-btn lp-btn-outline" style={{ width: '100%' }}>
                            Get Started
                        </a>
                    </div>

                    {/* Professional (Popular) */}
                    <div className="lp-price-card popular">
                        <div className="lp-popular-badge">Most Popular</div>
                        <div>
                            <div className="lp-price-tier">Professional Business</div>
                            <p className="lp-price-desc">Complete multi-branch operations with automated payroll, stock & POS.</p>
                        </div>
                        <div className="lp-price-val">
                            <span className="lp-price-amount">Popular</span>
                            <span className="lp-price-period">/ custom quote</span>
                        </div>
                        <ul className="lp-price-features">
                            <li><Check size={16} color="#D4AF37" /> Up to 5 Branches</li>
                            <li><Check size={16} color="#D4AF37" /> Unlimited Field Collectors</li>
                            <li><Check size={16} color="#D4AF37" /> Automated Payroll & Commission</li>
                            <li><Check size={16} color="#D4AF37" /> Multi-Branch Inventory & POS</li>
                            <li><Check size={16} color="#D4AF37" /> Advanced Analytics & PDF Export</li>
                            <li><Check size={16} color="#D4AF37" /> Dedicated Customer Success Rep</li>
                        </ul>
                        <a href="#contact" className="lp-btn lp-btn-primary" style={{ width: '100%' }}>
                            Request Quote & Demo
                        </a>
                    </div>

                    {/* Enterprise */}
                    <div className="lp-price-card">
                        <div>
                            <div className="lp-price-tier">Enterprise Cloud</div>
                            <p className="lp-price-desc">Custom domain branding, dedicated server capacity, and priority 24/7 SLA.</p>
                        </div>
                        <div className="lp-price-val">
                            <span className="lp-price-amount">Custom</span>
                            <span className="lp-price-period">/ organization</span>
                        </div>
                        <ul className="lp-price-features">
                            <li><Check size={16} color="#D4AF37" /> Unlimited Branches & Users</li>
                            <li><Check size={16} color="#D4AF37" /> Dedicated Subdomain (yourname.neziz.cloud)</li>
                            <li><Check size={16} color="#D4AF37" /> Custom Tenant Branding & Logo</li>
                            <li><Check size={16} color="#D4AF37" /> Custom Feature Development</li>
                            <li><Check size={16} color="#D4AF37" /> Dedicated Cloud Instance & Backups</li>
                            <li><Check size={16} color="#D4AF37" /> 24/7 Priority Support & On-Site Training</li>
                        </ul>
                        <a href="#contact" className="lp-btn lp-btn-outline" style={{ width: '100%' }}>
                            Talk to Enterprise Sales
                        </a>
                    </div>
                </div>
            </section>

            {/* Contact / Demo Section */}
            <section id="contact" className="lp-section" style={{ paddingTop: '0' }}>
                <div className="lp-contact-box">
                    <div className="lp-contact-info">
                        <span className="lp-section-tag">Let's Talk</span>
                        <h2 className="lp-contact-title">Experience Neziz Cloud in Action</h2>
                        <p className="lp-contact-desc">
                            Request a live walkthrough with our ERP specialists. We'll show you how Neziz eliminates collection losses and streamlines your branches in minutes.
                        </p>

                        <div className="lp-contact-details">
                            <div className="lp-contact-row">
                                <div className="lp-contact-icon">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--lp-text-primary)' }}>WhatsApp / Phone:</strong>
                                    <div>Direct Specialist Support Available</div>
                                </div>
                            </div>

                            <div className="lp-contact-row">
                                <div className="lp-contact-icon">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--lp-text-primary)' }}>Platform Cloud:</strong>
                                    <div>neziz.cloud &bull; Dedicated Multi-Tenant Infrastructure</div>
                                </div>
                            </div>

                            <div className="lp-contact-row">
                                <div className="lp-contact-icon">
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--lp-text-primary)' }}>Enterprise Security:</strong>
                                    <div>Daily Automated Backups & Encrypted Data</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        {formSubmitted ? (
                            <div className="lp-form-success">
                                <CheckCircle2 size={32} style={{ marginBottom: '8px' }} />
                                <h3>Thank you for reaching out!</h3>
                                <p>Our solutions specialist will contact you shortly to schedule your live demo.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleFormSubmit} className="lp-demo-form">
                                <div className="lp-form-row">
                                    <div className="lp-input-group">
                                        <label>Your Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Victor Mensah"
                                            value={demoForm.name}
                                            onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="lp-input-group">
                                        <label>Company / Enterprise</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Victor Trading Ltd"
                                            value={demoForm.company}
                                            onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="lp-form-row">
                                    <div className="lp-input-group">
                                        <label>Phone / WhatsApp</label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="e.g. +233 24 123 4567"
                                            value={demoForm.phone}
                                            onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="lp-input-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="you@company.com"
                                            value={demoForm.email}
                                            onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="lp-input-group">
                                    <label>Number of Branches</label>
                                    <select
                                        value={demoForm.branches}
                                        onChange={(e) => setDemoForm({ ...demoForm, branches: e.target.value })}
                                    >
                                        <option value="1">1 Branch</option>
                                        <option value="2-5">2 to 5 Branches</option>
                                        <option value="6-15">6 to 15 Branches</option>
                                        <option value="15+">15+ Branches (Enterprise)</option>
                                    </select>
                                </div>

                                <div className="lp-input-group">
                                    <label>Tell Us About Your Requirements</label>
                                    <textarea
                                        rows="3"
                                        placeholder="What operations would you like to automate? (Daily contributions, payroll, POS, etc.)"
                                        value={demoForm.message}
                                        onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                                    ></textarea>
                                </div>

                                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg" style={{ width: '100%' }}>
                                    <Send size={18} /> Submit & Connect on WhatsApp
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="lp-footer">
                <div className="lp-footer-container">
                    <div className="lp-footer-top">
                        <div className="lp-footer-brand">
                            <div className="lp-brand">
                                <img
                                    src="/Neziz-logo2.png"
                                    alt="Neziz"
                                    className="lp-brand-logo"
                                    onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                                />
                                <div className="lp-brand-text">
                                    <span className="lp-brand-name">Neziz</span>
                                    <span className="lp-brand-tag">Cloud ERP</span>
                                </div>
                            </div>
                            <p className="lp-footer-desc">
                                Next-generation multi-tenant cloud enterprise resource planning suite for microfinance, savings, retail, and branch operations.
                            </p>
                        </div>

                        <div className="lp-footer-col">
                            <h4 className="lp-footer-heading">Solutions</h4>
                            <ul className="lp-footer-links">
                                <li><a href="#solutions">Microfinance & Susu</a></li>
                                <li><a href="#solutions">Savings & Credit Unions</a></li>
                                <li><a href="#solutions">Retail & Inventory</a></li>
                                <li><a href="#solutions">Multi-Branch Groups</a></li>
                            </ul>
                        </div>

                        <div className="lp-footer-col">
                            <h4 className="lp-footer-heading">Platform</h4>
                            <ul className="lp-footer-links">
                                <li><a href="#modules">Daily Cards & Susu</a></li>
                                <li><a href="#passbook">Digital Passbook</a></li>
                                <li><a href="#modules">Close of Day</a></li>
                                <li><a href="#modules">Payroll & Commissions</a></li>
                                <li><Link to="/login">Tenant Portal Login</Link></li>
                            </ul>
                        </div>

                        <div className="lp-footer-col">
                            <h4 className="lp-footer-heading">Connect</h4>
                            <ul className="lp-footer-links">
                                <li><a href="#contact">Schedule Demo</a></li>
                                <li><a href="#pricing">Subscription Tiers</a></li>
                                <li><Link to="/login">Staff Sign In</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="lp-footer-bottom">
                        <div>
                            &copy; {new Date().getFullYear()} Neziz Cloud ERP Platform. All rights reserved.
                        </div>

                        {/* Hidden/Discreet Super Admin Trigger Icon as requested */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#475569' }}>Secured Cloud Environment</span>
                            <Link
                                to="/admin/dashboard"
                                className="lp-admin-secret-trigger"
                                title="Admin Portal"
                                aria-label="System Administration Portal"
                            >
                                <Shield size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

