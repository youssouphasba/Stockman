import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
    }
}

const Analytics = () => {
    const location = useLocation();
    const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

    useEffect(() => {
        if (!GA_MEASUREMENT_ID) return;

        // Load GA4 script
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        document.head.appendChild(script);

        // Initialize GA4
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
            window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID);

        return () => {
            // Cleanup (optional)
        };
    }, [GA_MEASUREMENT_ID]);

    useEffect(() => {
        if (!GA_MEASUREMENT_ID) return;
        window.gtag('config', GA_MEASUREMENT_ID, {
            page_path: location.pathname + location.search,
        });
    }, [location, GA_MEASUREMENT_ID]);

    return null;
};

export default Analytics;
