/**
 * Utility to update favicon dynamically
 */

export const setFavicon = (logoUrl) => {
    if (!logoUrl) return;

    try {
        // Update or create favicon link directly without canvas (avoids CORS issues)
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.type = 'image/png';
            document.head.appendChild(favicon);
        }
        
        // Set the logo URL directly as favicon
        favicon.href = logoUrl;
    } catch (error) {
        console.error('Error setting favicon:', error);
    }
};

export const setPageTitle = (companyName) => {
    if (companyName) {
        document.title = `${companyName} - Contribution Manager`;
    }
};
