/**
 * Utility to update favicon dynamically
 */

export const setFavicon = (logoUrl) => {
    if (!logoUrl) return;

    try {
        // Update or create favicon link
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        
        // Determine the favicon type based on URL
        if (logoUrl.includes('.svg')) {
            favicon.type = 'image/svg+xml';
        } else if (logoUrl.includes('.webp')) {
            favicon.type = 'image/webp';
        } else {
            favicon.type = 'image/png';
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
