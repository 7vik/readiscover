// ===================================
// OpenRouter LLM Client
// ===================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SUMMARIZER_MODEL = 'anthropic/claude-opus-4.5';
const DIALOGUE_MODEL = 'openai/gpt-5-chat';

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
    const systemPrompt = `You are analyzing a research paper to create a guided learning experience. You have the complete LaTeX source including all nested files and figures.

Your task:
1. Analyze the paper thoroughly and identify the ESSENCE of what this paper contributes - this could be a small, focused contribution, and that's perfectly fine
2. Extract key concepts suitable for guided discovery based on this essence, with emphasis on the key results, figures, and tables
3. Consider the user's existing knowledge
4. Identify relevant figures and tables for each concept
5. Structure concepts for Socratic dialogue (questions and discovery, not lectures)

Paper structure:
- Title: ${latexStructure.title}
- Full LaTeX content across all files
- Available figures: ${latexStructure.figures.map(f => f.label).join(', ')}

User's existing knowledge:
${userKnowledge}

IMPORTANT: Focus on the ESSENCE and core contribution of the paper, including key results, figures, and tables. If this is an incremental improvement or a focused technique, that's valuable - extract concepts around that specific contribution rather than trying to expand it into something larger. Pay special attention to the empirical results, experimental findings, and visual/tabular data that support the paper's claims.

Output a JSON array of concepts. Each concept should have:
- id: sequential number
- title: brief name (don't reveal the solution or conclusion)
- core_idea: 2-3 sentences framing it as a problem/question to explore, not an answer - focused on the paper's essence and key results
- required_background: prerequisites needed
- relevant_figures: array of figure labels (include tables if they're labeled as figures)
- discovery_path: approach for guiding discovery, with emphasis on interpreting results/figures/tables

Aim for 5-8 concepts that build logically toward understanding the paper's essential contribution and key results.
Frame each as something to discover through questioning, especially around experimental findings and visual/tabular evidence.

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
export async function getInitialMessage(apiKey, concepts, paperTitle, userKnowledge, latexStructure) {
    const availableFigures = latexStructure.figures.map(f => `- ${f.label}: ${f.caption || 'No caption'}`).join('\n');

    const systemPrompt = `You are a Socratic tutor for a research paper titled "${paperTitle}".

Guide the reader through key concepts using:
- Questions that help them discover concepts themselves
- Concrete problems and examples from the basics of this paper's domain
- Probing questions to identify gaps
- Formal mathematical setups when appropriate (use LaTeX)
- **FIGURES AND TABLES FREQUENTLY** (use the EXACT format: "{{fig:label}}" where label is from the list below - they display automatically)

IMPORTANT: Start from the fundamentals relevant to this paper. The phrase "Consider an autoregressive transformer $L_\\theta(x)$..." was just an example of formal setup style - adapt the formalism to whatever this paper actually discusses.

ALL AVAILABLE FIGURES AND TABLES:
${availableFigures}

User's existing knowledge:
${userKnowledge}

Concepts to guide discovery of:
${concepts.map((c, i) => `${i + 1}. ${c.title}: ${c.core_idea} [Figures: ${c.relevant_figures.join(', ') || 'none'}]`).join('\n')}

Begin with a brief greeting, then introduce the first concept by:
1. Setting up a concrete scenario from the paper's domain
2. Providing context or a motivating example
3. Asking a question to assess understanding
4. Never revealing the paper's solution
5. **SHOW relevant figures/tables when introducing concepts** - use {{fig:label}} format

Be concise. Avoid phrases like "since you have a strong understanding of..."`;


    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Begin the tutoring session. Remember to include figures and tables using the {{fig:label}} format.' }
    ];

    return await callOpenRouter(apiKey, DIALOGUE_MODEL, messages, 0.8);
}

/**
 * Process user answer and generate tutor response
 */
export async function processTutorResponse(apiKey, conversationHistory, currentConcept, allConcepts, userKnowledge, latexStructure) {
    const concept = allConcepts[currentConcept - 1];

    // Get all available figures and tables
    const availableFigures = latexStructure.figures.map(f => `- ${f.label}: ${f.caption || 'No caption'}`).join('\n');

    const systemPrompt = `You are a Socratic tutor guiding discovery through questioning.

Current concept:
Title: ${concept.title}
Core idea: ${concept.core_idea}
Required background: ${concept.required_background}
Relevant figures for this concept: ${concept.relevant_figures.join(', ')}
Discovery path: ${concept.discovery_path || 'Guide through questioning'}

User's existing knowledge:
${userKnowledge}

ALL AVAILABLE FIGURES AND TABLES IN THE PAPER:
${availableFigures}

Available paper content:
${latexStructure.allTexContent.slice(0, 8000)}...

Approach:
- FIRST: Start your response with a progress estimate in this EXACT format on its own line: "PROGRESS: XX%" where XX is a number 0-100 representing how much the user has progressed in fully rediscovering the essence of this paper and understanding its key results
- Be CONSERVATIVE with progress estimates - progress should increase gradually (5-15% per exchange)
- CRITICAL: Do NOT reach 100% until you have thoroughly covered ALL of the following:
  * The paper's main methodology
  * ALL key results and experimental findings
  * ALL important figures and their interpretation (YOU MUST SHOW FIGURES!)
  * ALL important tables and their interpretation (YOU MUST SHOW TABLES!)
  * The paper's core contributions and conclusions
- **CRITICALLY IMPORTANT**: You MUST actively show figures and tables throughout the dialogue. Research papers are fundamentally about presenting evidence through visual and tabular data. Do NOT complete the session without showing the paper's key figures and tables!
- For the current concept, you should show AT LEAST ONE of the relevant figures: ${concept.relevant_figures.join(', ')}
- Assess understanding - what's clear vs. unclear?
- Ask guiding questions that help them discover answers
- Never spoil the final insight - build toward it incrementally
- Use mathematical formulations appropriate to this paper's domain
- Provide concrete examples when helpful, especially from the paper's results and experiments
- **SHOW FIGURES AND TABLES FREQUENTLY**: Use the format {{fig:label}} where label is from the list above (e.g., "{{fig:architecture}}" or "{{fig:tab1}}")
  * Example: "Let's look at the main results {{fig:results}} - what patterns do you notice?"
  * Example: "Here are the key findings {{fig:table1}} - how would you interpret these numbers?"
- Guide them to interpret results, figures, and tables - ask "What does this figure suggest?", "How would you interpret these results?", "What patterns do you notice in this table?"
- Ask "What would happen if...", "Why might...", "How could we formalize..." instead of explaining
- When they show genuine understanding of the current area, say "Let's move to the next concept"
- Build from first principles, progressing toward understanding the key empirical findings
- ONLY when progress reaches 100% (meaning you've covered everything above INCLUDING showing all key figures/tables), provide a celebration message and offer to either test their understanding or answer any remaining questions

Rules:
1. ALWAYS start with "PROGRESS: XX%" on the first line
2. Progress should be gradual and realistic (typically 5-15% per exchange, never jump by 30%+)
3. Do NOT declare 100% until you have covered all main results, all key figures, all key tables, and all core contributions
4. **YOU MUST SHOW FIGURES AND TABLES - this is not optional!** Include at least one {{fig:label}} reference in most of your responses, especially when discussing results
5. Never reveal conclusions upfront
6. Guide through questions, not lectures
7. Be concise - avoid phrases like "since you have a strong understanding of..."
8. Reference figures using {{fig:label}} format ONLY - choose from the available figures list above
9. ONLY at 100% progress (after covering everything INCLUDING showing key figures/tables), celebrate completion and ask if they want to be tested or have questions

Respond naturally. Use LaTeX with $ or $$ as needed.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
    ];

    return await callOpenRouter(apiKey, DIALOGUE_MODEL, messages, 0.8);
}
