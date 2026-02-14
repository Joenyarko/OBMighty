/**
 * Utility to update favicon dynamically
 */

export const setFavicon = (logoUrl) => {
    if (!logoUrl) return;

    try {
        // Create a canvas to convert image to favicon
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 64, 64);

            // Draw image centered
            const size = Math.min(img.width, img.height);
            const x = (64 - size) / 2;
            const y = (64 - size) / 2;
            ctx.drawImage(img, x, y, size, size);

            // Convert canvas to favicon
            const faviconUrl = canvas.toDataURL('image/png');

            // Update or create favicon link
            let favicon = document.querySelector('link[rel="icon"]');
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            favicon.href = faviconUrl;
        };

        img.onerror = () => {
            console.warn('Failed to load logo for favicon, falling back to direct URL:', logoUrl);
            updateFaviconLink(logoUrl);
        };

        img.src = logoUrl;
    } catch (error) {
        console.error('Error setting favicon, falling back to direct URL:', error);
        updateFaviconLink(logoUrl);
    }
};

const updateFaviconLink = (url) => {
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.href = url;
};

export const setPageTitle = (companyName) => {
    if (companyName) {
        document.title = `${companyName} - Contribution Manager`;
    }
};
