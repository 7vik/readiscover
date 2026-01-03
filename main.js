// ===================================
// Readiscover Frontend
// ===================================

// API Configuration
// Use localhost for local development (file:// protocol or localhost hostname)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
    ? 'http://localhost:8787'
    : 'https://api.readiscover.7vik.io';

// State Management
let sessionState = {
    sessionId: null,
    apiKey: null,
    userKnowledge: '',
    paperTitle: '',
    totalConcepts: 0,
    currentConcept: 0,
    isProcessing: false
};

// DOM Elements
const elements = {
    // Landing state
    landingState: document.getElementById('landing-state'),
    arxivUrlInput: document.getElementById('arxiv-url'),
    apiKeyInput: document.getElementById('api-key'),
    userKnowledgeInput: document.getElementById('user-knowledge'),
    beginBtn: document.getElementById('begin-btn'),
    errorMessage: document.getElementById('error-message'),

    // Loading state
    loadingState: document.getElementById('loading-state'),
    userKnowledgeLoading: document.getElementById('user-knowledge-loading'),
    progressSteps: document.querySelectorAll('.step'),

    // Chat state
    chatState: document.getElementById('chat-state'),
    paperTitleEl: document.querySelector('.paper-title'),
    progressFill: document.getElementById('progress-fill'),
    messagesContainer: document.getElementById('messages-container'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),

    // Complete state
    completeState: document.getElementById('complete-state'),
    restartBtn: document.getElementById('restart-btn')
};

// ===== Utility Functions =====

// Simple markdown parser
function parseMarkdown(text) {
    // Escape HTML first
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Preserve LaTeX (inline and display)
    const latexBlocks = [];
    html = html.replace(/\$\$(.*?)\$\$/gs, (match, content) => {
        latexBlocks.push(`\\[${content}\\]`);
        return `___LATEX_BLOCK_${latexBlocks.length - 1}___`;
    });
    html = html.replace(/\$(.*?)\$/g, (match, content) => {
        latexBlocks.push(`\\(${content}\\)`);
        return `___LATEX_INLINE_${latexBlocks.length - 1}___`;
    });

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Line breaks and paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = `<p>${html}</p>`;

    // Restore LaTeX
    latexBlocks.forEach((latex, i) => {
        html = html.replace(`___LATEX_BLOCK_${i}___`, latex);
        html = html.replace(`___LATEX_INLINE_${i}___`, latex);
    });

    return html;
}

function showState(stateName) {
    document.querySelectorAll('.state').forEach(state => state.classList.remove('active'));
    const targetState = document.getElementById(`${stateName}-state`);
    if (targetState) {
        targetState.classList.add('active');
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    setTimeout(() => {
        elements.errorMessage.classList.add('hidden');
    }, 5000);
}

function extractArxivId(input) {
    // Handle various arXiv input formats
    const patterns = [
        /arxiv\.org\/abs\/(\d+\.\d+)/i,
        /arxiv\.org\/pdf\/(\d+\.\d+)/i,
        /^(\d+\.\d+)$/
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

function updateProgressStep(stepName, status) {
    const step = document.querySelector(`.step[data-step="${stepName}"]`);
    if (step) {
        step.classList.remove('active', 'completed');
        if (status === 'active') {
            step.classList.add('active');
        } else if (status === 'completed') {
            step.classList.add('completed');
        }
    }
}

function toggleKnowledgeEditor() {
    const headers = document.querySelectorAll('.knowledge-header');
    headers.forEach(header => {
        const content = header.nextElementSibling;
        if (content && content.classList.contains('knowledge-content')) {
            content.classList.toggle('expanded');
            const icon = header.querySelector('.toggle-icon');
            if (icon) {
                icon.style.transform = content.classList.contains('expanded')
                    ? 'rotate(180deg)'
                    : 'rotate(0deg)';
            }
        }
    });
}

// Make toggleKnowledgeEditor globally available
window.toggleKnowledgeEditor = toggleKnowledgeEditor;

// ===== Message Rendering =====

function renderMessage(type, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;

    const headerEl = document.createElement('div');
    headerEl.className = 'message-header';
    headerEl.textContent = type === 'system' ? 'System' : type === 'tutor' ? 'Tutor' : 'You';

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    // Parse markdown and LaTeX for tutor messages
    contentEl.innerHTML = type === 'tutor' ? parseMarkdown(content) : content;

    messageEl.appendChild(headerEl);
    messageEl.appendChild(contentEl);
    elements.messagesContainer.appendChild(messageEl);

    // Only auto-scroll for user messages (so they stay in view)
    // For tutor messages, let user manually scroll to read
    if (type === 'user') {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    // Trigger MathJax rendering
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([contentEl]).catch(err => console.error('MathJax error:', err));
    }
}

function renderFigure(figureData) {
    const { label, caption, format, data } = figureData;
    const mimeType = format === 'pdf' ? 'application/pdf' :
                     format === 'png' ? 'image/png' :
                     format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 'image/png';

    let figureHTML = '<div class="figure-container">';

    if (format === 'pdf') {
        // For PDFs, create an embed or object tag
        figureHTML += `
            <object data="data:${mimeType};base64,${data}" type="${mimeType}"
                    width="100%" style="max-width: 600px; min-height: 400px;">
                <p>PDF figure: ${label}</p>
            </object>
        `;
    } else {
        // For images
        figureHTML += `
            <img src="data:${mimeType};base64,${data}"
                 alt="${caption || label}"
                 class="figure-image" />
        `;
    }

    if (caption) {
        figureHTML += `<div class="figure-caption">${caption}</div>`;
    }

    figureHTML += '</div>';
    return figureHTML;
}

// ===== API Functions =====

async function startSession() {
    const arxivInput = elements.arxivUrlInput.value.trim();
    const apiKey = elements.apiKeyInput.value.trim();
    const userKnowledge = elements.userKnowledgeInput.value.trim();

    // Validation
    if (!arxivInput) {
        showError('Please enter an arXiv paper URL or ID');
        return;
    }

    if (!apiKey) {
        showError('Please enter your OpenRouter API key');
        return;
    }

    const arxivId = extractArxivId(arxivInput);
    if (!arxivId) {
        showError('Invalid arXiv URL or ID format');
        return;
    }

    // Store state
    sessionState.apiKey = apiKey;
    sessionState.userKnowledge = userKnowledge;

    // Show loading state
    showState('loading');
    elements.userKnowledgeLoading.value = userKnowledge;

    // Simulate progress steps
    const steps = ['download', 'reconstruct', 'parse', 'index', 'analyze'];
    let currentStepIndex = 0;

    const progressInterval = setInterval(() => {
        if (currentStepIndex > 0) {
            updateProgressStep(steps[currentStepIndex - 1], 'completed');
        }
        if (currentStepIndex < steps.length) {
            updateProgressStep(steps[currentStepIndex], 'active');
            currentStepIndex++;
        }
    }, 4000);

    try {
        const response = await fetch(`${API_BASE_URL}/session/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                arxiv_id: arxivId,
                openrouter_api_key: apiKey,
                user_knowledge_text: elements.userKnowledgeLoading.value
            })
        });

        clearInterval(progressInterval);
        steps.forEach(step => updateProgressStep(step, 'completed'));

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start session');
        }

        const data = await response.json();

        // Update session state
        sessionState.sessionId = data.session_id;
        sessionState.paperTitle = data.paper_title || 'Research Paper';
        sessionState.totalConcepts = data.total_concepts || 0;
        sessionState.currentConcept = 1;

        // Setup chat interface
        elements.paperTitleEl.textContent = sessionState.paperTitle;
        messageCount = 0; // Reset message counter
        updateConceptProgress();

        // Show initial tutor message
        if (data.initial_message) {
            renderMessage('tutor', data.initial_message);
        }

        // Transition to chat
        setTimeout(() => {
            showState('chat');
        }, 500);

    } catch (error) {
        clearInterval(progressInterval);
        console.error('Error starting session:', error);
        showError(error.message || 'Failed to start session. Please try again.');
        showState('landing');
    }
}

async function sendAnswer() {
    const userAnswer = elements.userInput.value.trim();

    if (!userAnswer || sessionState.isProcessing) {
        return;
    }

    // Disable input
    sessionState.isProcessing = true;
    elements.userInput.disabled = true;
    elements.sendBtn.disabled = true;

    // Show user message
    renderMessage('user', userAnswer);
    elements.userInput.value = '';

    try {
        const response = await fetch(`${API_BASE_URL}/session/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionState.sessionId,
                user_answer: userAnswer
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to process answer');
        }

        const data = await response.json();

        // Show tutor response
        if (data.tutor_message) {
            renderMessage('tutor', data.tutor_message);
        }

        // Render any figures
        if (data.figures && data.figures.length > 0) {
            data.figures.forEach(figure => {
                const figureHTML = renderFigure(figure);
                renderMessage('tutor', figureHTML);
            });
        }

        // Update progress
        if (data.current_concept !== undefined) {
            const movedToConcept = data.current_concept !== sessionState.currentConcept;
            sessionState.currentConcept = data.current_concept;

            // Reset message count when moving to new concept
            if (movedToConcept) {
                messageCount = 0;
            }

            updateConceptProgress();
        }

        // Increment progress with each exchange
        incrementProgress();

        // Check if complete
        if (data.is_complete) {
            setTimeout(() => {
                showState('complete');
            }, 1000);
        }

    } catch (error) {
        console.error('Error sending answer:', error);
        renderMessage('system', 'Sorry, there was an error processing your response. Please try again.');
    } finally {
        sessionState.isProcessing = false;
        elements.userInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.userInput.focus();
    }
}

// Track granular progress within current concept
let messageCount = 0;
const MESSAGES_PER_CONCEPT = 5; // Assume ~5 messages per concept

function updateConceptProgress() {
    // Calculate progress: each concept is worth 1/totalConcepts
    // Within a concept, we add fractional progress based on message count
    const conceptProgress = (sessionState.currentConcept - 1) / sessionState.totalConcepts;
    const withinConceptProgress = (messageCount / MESSAGES_PER_CONCEPT) / sessionState.totalConcepts;

    // Never exceed the current concept boundary
    const maxProgress = sessionState.currentConcept / sessionState.totalConcepts;
    const currentProgress = Math.min(conceptProgress + withinConceptProgress, maxProgress);

    // Convert to percentage and update, with minimum 3% to show initial progress
    const percentage = Math.max(3, Math.min(currentProgress * 100, 100));
    elements.progressFill.style.width = `${percentage}%`;
}

function incrementProgress() {
    messageCount++;
    updateConceptProgress();
}

function resetApplication() {
    // Reset state
    sessionState = {
        sessionId: null,
        apiKey: null,
        userKnowledge: '',
        paperTitle: '',
        totalConcepts: 0,
        currentConcept: 0,
        isProcessing: false
    };

    // Reset inputs
    elements.arxivUrlInput.value = '';
    elements.apiKeyInput.value = '';
    elements.userKnowledgeInput.value = `I already know about:
- Transformer architecture
- Backpropagation
- Gradient-based optimization
- LLM inference and decoding
- Basic probability and linear algebra`;

    // Clear messages
    elements.messagesContainer.innerHTML = '';

    // Reset progress steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });

    // Show landing state
    showState('landing');
}

// ===== Event Listeners =====

elements.beginBtn.addEventListener('click', startSession);

elements.sendBtn.addEventListener('click', sendAnswer);

elements.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAnswer();
    }
});

elements.restartBtn.addEventListener('click', resetApplication);

// Allow Enter in arXiv input to submit
elements.arxivUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        startSession();
    }
});

// ===== Initialization =====

console.log('Readiscover initialized');
console.log('API Base URL:', API_BASE_URL);
