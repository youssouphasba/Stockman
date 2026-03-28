/**
 * Trusted Types default policy.
 * Sanitizes HTML by stripping <script> tags and event handlers.
 */

function sanitizeHTML(html: string): string {
    return html
        .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
        .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
        .replace(/javascript\s*:/gi, 'about:invalid');
}

if (typeof window !== 'undefined' && (window as any).trustedTypes) {
    try {
        if (!(window as any).trustedTypes.defaultPolicy) {
            (window as any).trustedTypes.createPolicy('default', {
                createHTML: (html: string) => sanitizeHTML(html),
                createScript: () => '',
                createScriptURL: (url: string) => {
                    if (url.startsWith(window.location.origin) || url.startsWith('https://')) {
                        return url;
                    }
                    return 'about:invalid';
                },
            });
        }
    } catch (e) {
        console.error('Failed to register Trusted Types policy:', e);
    }
}
