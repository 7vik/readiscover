// ===================================
// OpenRouter LLM Client
// ===================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SUMMARIZER_MODEL = 'anthropic/claude-opus-4.5';
const DIALOGUE_MODEL = 'anthropic/claude-sonnet-4.5';

/**
 * Call OpenRouter API
 */
async function callOpenRouter(apiKey, model, messages, temperature = 0.7) {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://readiscover.7vik.io',
            'X-Title': 'Readiscover'
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Summarize paper and extract concepts using Claude Opus 4.5
 */
export async function summarizePaper(apiKey, latexStructure, userKnowledge) {
    const systemPrompt = `You are an expert research paper analyzer. You have access to the complete LaTeX source of a research paper, including all nested files and figures.

Your task is to:
1. Thoroughly analyze the entire paper and all its nuances
2. Extract the key concepts that need to be understood
3. Consider the user's existing knowledge to avoid redundant explanations
4. Identify which figures are relevant to each concept

The paper structure:
- Title: ${latexStructure.title}
- Full LaTeX content across all files
- Available figures: ${latexStructure.figures.map(f => f.label).join(', ')}

User's existing knowledge:
${userKnowledge}

Output your analysis as a JSON array of concepts. Each concept should have:
- id: sequential number
- title: brief concept name
- core_idea: the key idea in 2-3 sentences
- required_background: what prerequisites are needed
- relevant_figures: array of figure labels that help explain this concept

Focus on concepts that build upon each other logically. Aim for 5-8 major concepts.

Return ONLY the JSON array, no other text.`;

    const userPrompt = `Here is the complete LaTeX source:\n\n${latexStructure.allTexContent}

Analyze this paper and extract the key concepts as a JSON array.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    try {
        const response = await callOpenRouter(apiKey, SUMMARIZER_MODEL, messages, 0.5);

        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('Failed to extract concepts from summarizer response');
        }

        const concepts = JSON.parse(jsonMatch[0]);
        return concepts;

    } catch (error) {
        console.error('Error in summarizePaper:', error);
        throw error;
    }
}

/**
 * Get initial dialogue message
 */
export async function getInitialMessage(apiKey, concepts, paperTitle, userKnowledge) {
    const systemPrompt = `You are an expert tutor helping a researcher deeply understand a research paper titled "${paperTitle}".

You will guide them through ${concepts.length} key concepts from the paper. Your role is to:
- Ask thought-provoking questions
- Adapt to their existing knowledge
- Reference figures when helpful
- Build understanding progressively

User's existing knowledge:
${userKnowledge}

The concepts you'll cover:
${concepts.map((c, i) => `${i + 1}. ${c.title}: ${c.core_idea}`).join('\n')}

Start by warmly greeting the user and introducing the first concept with an engaging question that assesses their initial understanding.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Begin the tutoring session.' }
    ];

    return await callOpenRouter(apiKey, DIALOGUE_MODEL, messages, 0.8);
}

/**
 * Process user answer and generate tutor response
 */
export async function processTutorResponse(apiKey, conversationHistory, currentConcept, allConcepts, userKnowledge, latexStructure) {
    const concept = allConcepts[currentConcept - 1];

    const systemPrompt = `You are an expert tutor guiding a researcher through a paper.

Current concept (${currentConcept} of ${allConcepts.length}):
Title: ${concept.title}
Core idea: ${concept.core_idea}
Required background: ${concept.required_background}
Relevant figures: ${concept.relevant_figures.join(', ')}

User's existing knowledge:
${userKnowledge}

Available paper content:
${latexStructure.allTexContent.slice(0, 5000)}...

Your role:
- Assess their understanding from their answer
- Ask follow-up questions or provide clarification
- Reference figures by their labels when helpful (e.g., "See figure fig:architecture")
- When they demonstrate sufficient understanding, explicitly say "Let's move to the next concept" to progress
- Build on what they know, skip what they already understand

Respond naturally and encouragingly. Use LaTeX math notation with $ or $$ when needed.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
    ];

    return await callOpenRouter(apiKey, DIALOGUE_MODEL, messages, 0.8);
}
