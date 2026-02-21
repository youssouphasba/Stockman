/**
 * Utility to register a "default" Trusted Types policy.
 * This is used to allow browser-injected scripts (like alert-observer.js)
 * to run when a strict Content Security Policy (CSP) is enforced.
 */

if (typeof window !== 'undefined' && (window as any).trustedTypes) {
    try {
        if (!(window as any).trustedTypes.defaultPolicy) {
            (window as any).trustedTypes.createPolicy('default', {
                createHTML: (html: string) => html,
                createScript: (script: string) => script,
                createScriptURL: (url: string) => url,
            });
            console.log('Trusted Types default policy registered.');
        }
    } catch (e) {
        console.error('Failed to register Trusted Types policy:', e);
    }
}
