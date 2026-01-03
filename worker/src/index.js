// ===================================
// Readiscover Cloudflare Worker
// ===================================

import { handleSessionStart } from './session-start';
import { handleSessionAnswer } from './session-answer';

// In-memory session storage
const sessions = new Map();

// Session cleanup interval (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Cleanup expired sessions (called on each request)
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            sessions.delete(sessionId);
            console.log(`Cleaned up expired session: ${sessionId}`);
        }
    }
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env, ctx) {
        // Cleanup expired sessions on each request
        cleanupExpiredSessions();

        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Health check
        if (url.pathname === '/health' || url.pathname === '/') {
            return new Response(JSON.stringify({ status: 'ok', service: 'readiscover-api' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            // Route handling
            if (url.pathname === '/session/start' && request.method === 'POST') {
                return await handleSessionStart(request, sessions, corsHeaders);
            }

            if (url.pathname === '/session/answer' && request.method === 'POST') {
                return await handleSessionAnswer(request, sessions, corsHeaders);
            }

            // 404
            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
