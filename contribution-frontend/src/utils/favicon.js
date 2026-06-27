/**
 * Utility to update favicon and PWA icons dynamically based on the current company.
 */

export const setFavicon = (logoUrl) => {
    if (!logoUrl) return;

    try {
        // --- Browser tab favicon ---
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }

        // Determine the favicon MIME type based on file extension
        if (logoUrl.includes('.svg')) {
            favicon.type = 'image/svg+xml';
        } else if (logoUrl.includes('.webp')) {
            favicon.type = 'image/webp';
        } else if (logoUrl.includes('.png')) {
            favicon.type = 'image/png';
        } else {
            favicon.type = 'image/jpeg';
        }
        favicon.href = logoUrl;

        // --- iOS Home Screen icon (apple-touch-icon) ---
        // This is what appears on the iPhone/iPad home screen when the user adds the app
        let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleIcon) {
            appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            document.head.appendChild(appleIcon);
        }
        appleIcon.href = logoUrl;

    } catch (error) {
        console.error('Error setting favicon:', error);
    }
};

export const setPageTitle = (companyName) => {
    if (!companyName) return;

    document.title = `${companyName} - Contribution Manager`;

    // Update iOS PWA app title (shown under the icon on the home screen)
    const appleTitleMeta = document.getElementById('apple-app-title');
    if (appleTitleMeta) {
        appleTitleMeta.setAttribute('content', companyName);
    }
};
