/**
 * Global API configuration.
 * If VITE_API_BASE_URL is set in environment (e.g. on Vercel), requests target that base URL.
 * Otherwise, it defaults to relative paths (''), which works with Vite proxy and Vercel rewrites.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
