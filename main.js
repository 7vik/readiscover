// ===================================
// Readiscover Frontend
// ===================================

// API Configuration
// Use localhost for local development (file:// protocol or localhost hostname)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
    ? 'http://localhost:8787'
    : 'https://readiscover-api.zsatvik.workers.dev';

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

// Default knowledge text (more verbose and technical)
const DEFAULT_KNOWLEDGE = `I have advanced knowledge in the following areas:

- Transformer architecture and attention mechanisms: including multi-head self-attention, positional encodings, layer normalization, feedforward networks, and the encoder-decoder paradigm
- Deep learning optimization: backpropagation through computational graphs, stochastic gradient descent variants (Adam, AdamW, RMSprop), learning rate schedules, gradient clipping
- Neural network training dynamics: loss landscapes, convergence properties, regularization techniques (dropout, weight decay, data augmentation)
- Large Language Models (LLMs): autoregressive generation, causal masking, sampling strategies (greedy, top-k, nucleus/top-p), sequence-to-sequence modeling
- Mathematical foundations: linear algebra (matrix operations, eigendecomposition, SVD), probability theory (random variables, distributions, expectation), information theory (entropy, KL divergence)
- Machine learning fundamentals: supervised/unsupervised learning, overfitting/underfitting, bias-variance tradeoff, cross-validation`;

// Fun facts array (loaded from facts.txt)
let funFacts = [];
let factRotationInterval = null;

// DOM Elements
const elements = {
    // Landing state
    landingState: document.getElementById('landing-state'),
    arxivUrlInput: document.getElementById('arxiv-url'),
    apiKeyInput: document.getElementById('api-key'),
    beginBtn: document.getElementById('begin-btn'),
    errorMessage: document.getElementById('error-message'),

    // Loading state
    loadingState: document.getElementById('loading-state'),
    userKnowledgeLoading: document.getElementById('user-knowledge-loading'),
    funFactText: document.getElementById('fun-fact-text'),
    currentStepText: document.getElementById('current-step-text'),
    circleProgress: null, // Will be set after DOM load

    // Chat state
    chatState: document.getElementById('chat-state'),
    paperTitleEl: document.querySelector('.paper-title'),
    progressFill: document.getElementById('progress-fill'),
    messagesContainer: document.getElementById('messages-container'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    skipBtn: document.getElementById('skip-btn'),

    // Complete state
    completeState: document.getElementById('complete-state'),
    restartBtn: document.getElementById('restart-btn')
};

// ===== Utility Functions =====

// Load fun facts from facts.txt
async function loadFunFacts() {
    try {
        const response = await fetch('facts.txt');
        if (!response.ok) {
            throw new Error(`Failed to load facts: ${response.status}`);
        }
        const text = await response.text();
        funFacts = text.split('\n').filter(line => line.trim().length > 0);
        console.log(`Loaded ${funFacts.length} facts from facts.txt`);
    } catch (error) {
        console.error('Error loading facts:', error);
        // Fallback facts if file can't be loaded
        funFacts = [
            'The human brain contains approximately 86 billion neurons.',
            'A single bolt of lightning contains enough energy to toast 100,000 slices of bread.',
            'The longest English word without a vowel is "rhythms".'
        ];
        console.warn('Using fallback facts - only 3 facts available');
    }
}

// Get random fact
function getRandomFact() {
    if (funFacts.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * funFacts.length);
    return funFacts[randomIndex];
}

// Display random fact
function showRandomFact() {
    if (elements.funFactText) {
        elements.funFactText.textContent = getRandomFact();
    }
}

// Start fact rotation (every 10 seconds)
function startFactRotation() {
    showRandomFact(); // Show first fact immediately
    factRotationInterval = setInterval(showRandomFact, 10000);
}

// Stop fact rotation
function stopFactRotation() {
    if (factRotationInterval) {
        clearInterval(factRotationInterval);
        factRotationInterval = null;
    }
}

// Update progress circle
function updateProgressCircle(progress) {
    if (elements.circleProgress) {
        // Circle circumference = 2 * PI * r = 2 * 3.14159 * 45 = 283
        const circumference = 283;
        const offset = circumference - (progress * circumference);
        elements.circleProgress.style.strokeDashoffset = offset;
    }
}

// Simple markdown parser
function parseMarkdown(text) {
    // Preserve existing HTML (figures, images, etc.) and LaTeX before escaping
    const preservedBlocks = [];

    // Preserve HTML blocks (like figure-container divs and img tags)
    let html = text.replace(/<div class="figure-container">[\s\S]*?<\/div>/g, (match) => {
        preservedBlocks.push(match);
        return `___PRESERVED_HTML_${preservedBlocks.length - 1}___`;
    });

    // Preserve standalone img tags
    html = html.replace(/<img[^>]*>/g, (match) => {
        preservedBlocks.push(match);
        return `___PRESERVED_HTML_${preservedBlocks.length - 1}___`;
    });

    // Preserve LaTeX display equations (before inline to handle $$ before $)
    html = html.replace(/\$\$(.*?)\$\$/gs, (_match, content) => {
        preservedBlocks.push(`\\[${content}\\]`);
        return `___PRESERVED_HTML_${preservedBlocks.length - 1}___`;
    });

    // Preserve LaTeX inline equations
    html = html.replace(/\$(.*?)\$/g, (_match, content) => {
        preservedBlocks.push(`\\(${content}\\)`);
        return `___PRESERVED_HTML_${preservedBlocks.length - 1}___`;
    });

    // Preserve LaTeX environments (tables, align, equation, etc.)
    // This captures \begin{...} ... \end{...} blocks
    html = html.replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
        preservedBlocks.push(match);
        return `___PRESERVED_HTML_${preservedBlocks.length - 1}___`;
    });

    // Remove LaTeX figure references like {{fig:something}}
    html = html.replace(/\{\{fig:[^}]+\}\}/g, '');

    // Escape remaining HTML
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

    // Restore preserved HTML and LaTeX
    preservedBlocks.forEach((block, i) => {
        html = html.replace(`___PRESERVED_HTML_${i}___`, block);
    });

    return html;
}

function showState(stateName) {
    document.querySelectorAll('.state').forEach(state => state.classList.remove('active'));
    const targetState = document.getElementById(`${stateName}-state`);
    if (targetState) {
        targetState.classList.add('active');
    }

    // Add/remove landing-active class for special scrolling behavior
    if (stateName === 'landing') {
        document.body.classList.add('landing-active');
    } else {
        document.body.classList.remove('landing-active');
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

    // Determine MIME type based on format
    const formatLower = (format || 'png').toLowerCase();
    let mimeType;
    let isPdf = false;

    switch (formatLower) {
        case 'pdf':
            mimeType = 'application/pdf';
            isPdf = true;
            break;
        case 'png':
            mimeType = 'image/png';
            break;
        case 'jpg':
        case 'jpeg':
            mimeType = 'image/jpeg';
            break;
        case 'gif':
            mimeType = 'image/gif';
            break;
        case 'svg':
            mimeType = 'image/svg+xml';
            break;
        case 'eps':
            // EPS files converted to PNG on backend, but if still EPS, show as image with warning
            mimeType = 'application/postscript';
            break;
        default:
            // Default to PNG for unknown formats
            mimeType = 'image/png';
    }

    let figureHTML = '<div class="figure-container">';

    // Render PDFs in iframe, everything else as image
    if (isPdf) {
        figureHTML += `
            <iframe
                src="data:${mimeType};base64,${data}"
                class="figure-pdf"
                title="${caption || label}">
            </iframe>
        `;
    } else {
        // For all image formats (PNG, JPG, GIF, SVG, etc.)
        figureHTML += `
            <img src="data:${mimeType};base64,${data}"
                 alt="${caption || label}"
                 class="figure-image" />
        `;
    }

    if (caption) {
        // Escape caption HTML but preserve it
        const escapedCaption = caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        figureHTML += `<div class="figure-caption">${escapedCaption}</div>`;
    }

    figureHTML += '</div>';
    return figureHTML;
}

// ===== API Functions =====

async function startSession() {
    const arxivInput = elements.arxivUrlInput.value.trim();
    const apiKey = elements.apiKeyInput.value.trim();
    const userKnowledge = DEFAULT_KNOWLEDGE; // Use default knowledge

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

    // Show loading state with knowledge editor
    showState('loading');
    elements.userKnowledgeLoading.value = userKnowledge;

    // Start fact rotation
    startFactRotation();

    // Progress steps with display names
    const steps = [
        { name: 'download', display: 'Downloading arXiv source…' },
        { name: 'reconstruct', display: 'Reconstructing LaTeX files…' },
        { name: 'parse', display: 'Parsing paper structure…' },
        { name: 'index', display: 'Indexing concepts and figures…' },
        { name: 'analyze', display: 'Analyzing with AI…' }
    ];
    let currentStepIndex = 0;

    const progressInterval = setInterval(() => {
        if (currentStepIndex < steps.length) {
            const step = steps[currentStepIndex];
            elements.currentStepText.textContent = step.display;

            // Animate circle from 0 to 1 over 4 seconds
            let progress = 0;
            const circleInterval = setInterval(() => {
                progress += 0.02; // Increment by 2% every 80ms = ~4 seconds
                if (progress >= 1) {
                    progress = 1;
                    clearInterval(circleInterval);
                }
                updateProgressCircle(progress);
            }, 80);

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
        stopFactRotation();
        updateProgressCircle(1); // Complete the circle

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
        stopFactRotation();
        console.error('Error starting session:', error);
        showError(error.message || 'Failed to start session. Please try again.');
        showState('landing');
    }
}

async function sendAnswer(isSkipped = false, autoAnswer = '') {
    let userAnswer;

    if (isSkipped) {
        userAnswer = autoAnswer;
    } else {
        userAnswer = elements.userInput.value.trim();
        if (!userAnswer || sessionState.isProcessing) {
            return;
        }
    }

    // Disable input
    sessionState.isProcessing = true;
    elements.userInput.disabled = true;
    elements.sendBtn.disabled = true;
    elements.skipBtn.disabled = true;

    // Show user message
    renderMessage('user', userAnswer);
    elements.userInput.value = '';

    // Retry logic: try up to 3 times with exponential backoff
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
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

            // Update progress using the percentage from the model
            if (data.progress_percentage !== null && data.progress_percentage !== undefined) {
                elements.progressFill.style.width = `${Math.max(3, Math.min(data.progress_percentage, 100))}%`;
            }

            // Update current concept
            if (data.current_concept !== undefined) {
                const movedToConcept = data.current_concept !== sessionState.currentConcept;
                sessionState.currentConcept = data.current_concept;

                // Reset message count when moving to new concept
                if (movedToConcept) {
                    messageCount = 0;
                }
            }

            // Check if complete
            if (data.is_complete) {
                setTimeout(() => {
                    showState('complete');
                }, 1000);
            }

            // Success - exit retry loop
            sessionState.isProcessing = false;
            elements.userInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.skipBtn.disabled = false;
            if (!isSkipped) {
                elements.userInput.focus();
            }
            return;

        } catch (error) {
            console.error(`Error sending answer (attempt ${attempt + 1}/${maxRetries}):`, error);
            lastError = error;

            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    // All retries failed
    console.error('All retry attempts failed:', lastError);
    renderMessage('system', 'Sorry, there was an error processing your response. Please try again.');
    sessionState.isProcessing = false;
    elements.userInput.disabled = false;
    elements.sendBtn.disabled = false;
    elements.skipBtn.disabled = false;
    if (!isSkipped) {
        elements.userInput.focus();
    }
}

async function skipQuestion() {
    if (sessionState.isProcessing) {
        return;
    }

    // Direct skip instruction
    const skipAnswer = "Please skip this one, give the answer yourself, and move on to the next thing.";
    await sendAnswer(true, skipAnswer);
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

elements.skipBtn.addEventListener('click', skipQuestion);

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

// Load fun facts on page load
loadFunFacts();

// Set up circle progress element reference
document.addEventListener('DOMContentLoaded', () => {
    elements.circleProgress = document.querySelector('.circle-progress');
    // Initialize landing-active class
    document.body.classList.add('landing-active');
});

console.log('Readiscover initialized');
console.log('API Base URL:', API_BASE_URL);
