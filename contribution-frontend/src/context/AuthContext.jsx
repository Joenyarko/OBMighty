import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { setFavicon, setPageTitle } from '../utils/favicon';
import { updatePWAManifest, resetPWAManifest } from '../utils/pwaManifest';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await authAPI.me();
            const userData = response.data.user;
            setUser(userData);

            // Fetch company data if user has company
            if (userData.company_id) {
                try {
                    const companyRes = await authAPI.getCompanyInfo?.();
                    if (companyRes?.data?.company) {
                        const companyData = companyRes.data.company;
                        setCompany(companyData);

                        // Update favicon and page title
                        if (companyData.logo_url) {
                            setFavicon(companyData.logo_url);
                        }
                        setPageTitle(companyData.name);
                        
                        // Update PWA manifest with company branding (for iOS and all devices)
                        updatePWAManifest(companyData);
                    }
                } catch (err) {
                    console.warn('Failed to fetch company info:', err);
                }
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            // Stateless auth: No need for CSRF token
            const response = await authAPI.login(credentials);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            setToken(token);
            setUser(user);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed',
            };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            setCompany(null);

            // Reset PWA manifest to default
            resetPWAManifest();
        }
    };

    const hasRole = (role) => {
        if (!user || !user.roles) return false;
        // Check if roles is array of strings or objects
        return user.roles.some(r => (typeof r === 'string' ? r === role : r.name === role));
    };

    const hasPermission = (permission) => {
        return user?.permissions?.includes(permission);
    };

    const value = {
        user,
        company,
        token,
        loading,
        login,
        logout,
        hasRole,
        hasPermission,
        isCEO: hasRole('ceo'),
        isSecretary: hasRole('secretary'),
        isWorker: hasRole('worker'),
        isSuperAdmin: hasRole('super_admin'),
        setUser, // Expose setUser for profile updates
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
