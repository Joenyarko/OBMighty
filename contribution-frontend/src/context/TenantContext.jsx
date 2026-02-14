import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTenantConfig();
    }, []);

    const fetchTenantConfig = async () => {
        try {
            // Use the shared API instance which has the correct BaseURL
            const response = await api.get('/config');
            const config = response.data;
            // console.log('Tenant Config Loaded:', config); // DEBUG LOG REMOVED

            setTenant(config);

            // Apply branding
            if (config.primary_color) {
                document.documentElement.style.setProperty('--primary-color', config.primary_color);

                // Convert Hex to RGB for opacity usage
                const hex = config.primary_color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);

                document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

                // Calculate Dark Variant (20% darker)
                const rDark = Math.max(0, r - 40);
                const gDark = Math.max(0, g - 40);
                const bDark = Math.max(0, b - 40);
                document.documentElement.style.setProperty('--primary-dark', `rgb(${rDark}, ${gDark}, ${bDark})`);
            }

            // Set document title
            if (config.app_name) {
                document.title = config.app_name;
            }

            // Update Favicon if provided (advanced)
            if (config.logo_url) {
                const link = document.querySelector("link[rel~='icon']");
                if (link) {
                    link.href = config.logo_url;
                }
            }

        } catch (error) {
            console.error('Failed to load tenant config:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#121212',
                color: '#D4AF37',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '16px'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <TenantContext.Provider value={{ tenant, loading }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within TenantProvider');
    }
    return context;
};
