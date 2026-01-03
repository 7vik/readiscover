// ===================================
// Session Start Handler
// ===================================

import { fetchArxivSource, findMainTexFile, extractLatexStructure } from './arxiv-handler';
import { summarizePaper, getInitialMessage } from './llm-client';

/**
 * Handle /session/start endpoint
 */
export async function handleSessionStart(request, sessions, corsHeaders) {
    try {
        const body = await request.json();
        const { arxiv_id, openrouter_api_key, user_knowledge_text } = body;

        // Validation
        if (!arxiv_id || !openrouter_api_key) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: arxiv_id, openrouter_api_key'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Generate session ID
        const sessionId = crypto.randomUUID();

        // Step 1: Fetch arXiv source
        console.log(`[${sessionId}] Fetching arXiv source for ${arxiv_id}`);
        const files = await fetchArxivSource(arxiv_id);

        // Step 2: Find main LaTeX file
        console.log(`[${sessionId}] Finding main LaTeX file`);
        const mainFile = findMainTexFile(files);
        if (!mainFile) {
            return new Response(JSON.stringify({
                error: 'Could not find main LaTeX file in source'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Step 3: Extract LaTeX structure
        console.log(`[${sessionId}] Extracting LaTeX structure`);
        const latexStructure = extractLatexStructure(files, mainFile);

        // Step 4: Summarize paper with Claude Opus
        console.log(`[${sessionId}] Summarizing paper with Claude Opus 4.5`);
        const concepts = await summarizePaper(
            openrouter_api_key,
            latexStructure,
            user_knowledge_text || ''
        );

        // Step 5: Get initial tutor message
        console.log(`[${sessionId}] Getting initial dialogue message`);
        const initialMessage = await getInitialMessage(
            openrouter_api_key,
            concepts,
            latexStructure.title,
            user_knowledge_text || ''
        );

        // Store session in memory
        const session = {
            sessionId,
            arxivId: arxiv_id,
            openrouterApiKey: openrouter_api_key,
            userKnowledge: user_knowledge_text || '',
            latexStructure,
            concepts,
            conversationHistory: [
                { role: 'assistant', content: initialMessage }
            ],
            currentConcept: 1,
            lastActivity: Date.now()
        };

        sessions.set(sessionId, session);

        console.log(`[${sessionId}] Session started successfully with ${concepts.length} concepts`);

        // Return response
        return new Response(JSON.stringify({
            session_id: sessionId,
            paper_title: latexStructure.title,
            total_concepts: concepts.length,
            initial_message: initialMessage
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in handleSessionStart:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Failed to start session'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
