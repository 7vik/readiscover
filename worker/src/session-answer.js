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

        // Extract progress percentage from tutor response
        let progressPercentage = null;
        let cleanedTutorResponse = tutorResponse;
        const progressMatch = tutorResponse.match(/^PROGRESS:\s*(\d+)%/m);
        if (progressMatch) {
            progressPercentage = parseInt(progressMatch[1], 10);
            // Remove the PROGRESS line from the response
            cleanedTutorResponse = tutorResponse.replace(/^PROGRESS:\s*\d+%\s*/m, '').trim();
        }

        // Get relevant figures for this response (before removing placeholders)
        const relevantFigures = extractReferencedFigures(
            cleanedTutorResponse,
            session.latexStructure.figures
        );

        // Remove figure placeholders from the message
        cleanedTutorResponse = removeFigurePlaceholders(cleanedTutorResponse);

        // Add tutor response to history (with PROGRESS line and figure placeholders removed)
        session.conversationHistory.push({
            role: 'assistant',
            content: cleanedTutorResponse
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

        // Prepare response
        const responseData = {
            tutor_message: cleanedTutorResponse,
            current_concept: session.currentConcept,
            is_complete: isComplete,
            figures: relevantFigures,
            progress_percentage: progressPercentage
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
 * Extract figures referenced in the tutor response and replace placeholders
 */
function extractReferencedFigures(message, allFigures) {
    const referencedFigures = [];

    // Find all {{fig:label}} patterns
    const figurePattern = /\{\{fig:([a-zA-Z0-9_-]+)\}\}/gi;
    let match;

    while ((match = figurePattern.exec(message)) !== null) {
        const label = match[1];
        const figure = allFigures.find(f => {
            if (!f.label) return false;
            return (
                f.label === label ||
                f.label === `fig:${label}` ||
                f.label.includes(label) ||
                f.label.toLowerCase().includes(label.toLowerCase())
            );
        });

        if (figure && !referencedFigures.find(f => f.label === figure.label)) {
            referencedFigures.push({
                label: figure.label || null,
                caption: figure.caption,
                format: figure.format,
                data: figure.base64
            });
        }
    }

    return referencedFigures;
}

/**
 * Remove figure placeholders from message
 */
function removeFigurePlaceholders(message) {
    // Remove {{fig:label}} patterns
    return message.replace(/\{\{fig:[a-zA-Z0-9_-]+\}\}/gi, '');
}
