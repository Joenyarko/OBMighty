/**
 * Domain utility to differentiate between the central platform domain
 * (neziz.cloud, neziz.online) and tenant company subdomains (e.g. victortrading.neziz.cloud).
 */

export const isTenantSubdomain = () => {
    if (typeof window === 'undefined') return false;

    const hostname = window.location.hostname.toLowerCase();

    // Query parameter overrides for manual testing or preview
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tenant') === 'true' || urlParams.get('tenant') === '1') {
        return true;
    }
    if (urlParams.get('landing') === 'true' || urlParams.get('landing') === '1') {
        return false;
    }

    // Local development defaults to central landing page unless tenant query param is passed
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        return false;
    }

    const parts = hostname.split('.');

    // A subdomain requires more parts than the root domain
    // e.g., victortrading.neziz.cloud (3 parts) vs neziz.cloud (2 parts)
    if (parts.length > 2) {
        const subdomain = parts[0];
        // 'www' and 'api' are reserved and not tenant companies
        if (subdomain !== 'www' && subdomain !== 'api') {
            return true;
        }
    }

    return false;
};

