import { useEffect } from 'react';

/**
 * Hook to add 'revealed' class to elements when they enter the viewport
 * @param selector CSS selector for elements to observe
 * @param threshold Visibility threshold (0 to 1)
 */
export const useScrollReveal = (selector = '.reveal', threshold = 0.1) => {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Stop observing once revealed
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: threshold
        });

        const elements = document.querySelectorAll(selector);
        elements.forEach(el => observer.observe(el));

        return () => {
            elements.forEach(el => observer.unobserve(el));
        };
    }, [selector, threshold]);
};
