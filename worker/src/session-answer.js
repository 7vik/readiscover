// ===================================
// Session Answer Handler
// ===================================

import { processTutorResponse } from './llm-client';

/**
 * Handle /session/answer endpoint
 */
export async function handleSessionAnswer(request, sessions, corsHeaders) {
    try {
        const body = await request.json();
        const { session_id, user_answer } = body;

        // Validation
        if (!session_id || !user_answer) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: session_id, user_answer'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get session
        const session = sessions.get(session_id);
        if (!session) {
            return new Response(JSON.stringify({
                error: 'Session not found or expired'
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Update last activity
        session.lastActivity = Date.now();

        // Add user answer to conversation history
        session.conversationHistory.push({
            role: 'user',
            content: user_answer
        });

        console.log(`[${session_id}] Processing answer for concept ${session.currentConcept}`);

        // Get tutor response
        const tutorResponse = await processTutorResponse(
            session.openrouterApiKey,
            session.conversationHistory,
            session.currentConcept,
            session.concepts,
            session.userKnowledge,
            session.latexStructure
        );

        // Add tutor response to history
        session.conversationHistory.push({
            role: 'assistant',
            content: tutorResponse
        });

        // Check if we should move to next concept
        const shouldProgress = tutorResponse.toLowerCase().includes("let's move to the next concept") ||
                             tutorResponse.toLowerCase().includes("move to the next concept") ||
                             tutorResponse.toLowerCase().includes("ready for the next concept");

        if (shouldProgress && session.currentConcept < session.concepts.length) {
            session.currentConcept += 1;
            console.log(`[${session_id}] Moving to concept ${session.currentConcept}`);
        }

        // Check if complete
        const isComplete = session.currentConcept >= session.concepts.length &&
                          (shouldProgress || tutorResponse.toLowerCase().includes("complete"));

        // Get relevant figures for this response
        const relevantFigures = extractReferencedFigures(
            tutorResponse,
            session.latexStructure.figures
        );

        // Prepare response
        const responseData = {
            tutor_message: tutorResponse,
            current_concept: session.currentConcept,
            is_complete: isComplete,
            figures: relevantFigures
        };

        // If complete, clean up session
        if (isComplete) {
            console.log(`[${session_id}] Session complete, cleaning up`);
            sessions.delete(session_id);
        }

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in handleSessionAnswer:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Failed to process answer'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Extract figures referenced in the tutor response
 */
function extractReferencedFigures(message, allFigures) {
    const referencedFigures = [];
    const figureRegex = /fig(?:ure)?[:\s]+([a-zA-Z0-9_-]+)/gi;

    let match;
    while ((match = figureRegex.exec(message)) !== null) {
        const label = match[1];
        const figure = allFigures.find(f =>
            f.label === label ||
            f.label === `fig:${label}` ||
            f.label.includes(label)
        );

        if (figure && !referencedFigures.find(f => f.label === figure.label)) {
            referencedFigures.push({
                label: figure.label,
                caption: figure.caption,
                format: figure.format,
                data: figure.base64
            });
        }
    }

    return referencedFigures;
}
