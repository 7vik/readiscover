# Readiscover

> Don't just read papers—readiscover them through guided exploration

Readiscover turns research papers into interactive learning experiences. Instead of passively reading, you're guided through a Socratic dialogue that helps you discover the paper's insights from first principles—making you a better researcher in the process.

## What makes it special?

**Deep understanding, not shallow summaries**
Analyzes the complete LaTeX source code, including all nested files and figures. No detail is lost.

**Socratic guidance**
Uses Claude to guide you through discovery with probing questions and mathematical problem setups—never spoiling the conclusions.

**Figure-aware learning**
Figures appear automatically when relevant, seamlessly integrated into the conversation.

**Privacy-first**
No accounts, no cookies, no analytics, no persistence. Everything disappears when you close the tab. Your API key is never stored or logged.

**Beautiful and simple**
A clean interface with a magical animated background. Just you and the paper.

## Quick Start

1. Visit [readiscover.7vik.io](https://readiscover.7vik.io)
2. Paste an arXiv paper ID (like `2401.01234`) or URL
3. Add your OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))
4. Click "Begin Readiscovery"

That's it. The app downloads the paper, analyzes it with Claude Opus 4.5, and starts an interactive tutoring session with Claude Sonnet 4.5.

## How it works

**Frontend**: Static HTML/CSS/JS hosted on GitHub Pages. Uses MathJax for LaTeX rendering.

**Backend**: Cloudflare Worker that fetches arXiv sources, parses LaTeX, extracts figures, and manages tutoring sessions via OpenRouter.

**Session flow**:
1. You submit a paper → Worker downloads and analyzes it
2. Claude Opus identifies key concepts and creates a discovery path
3. Claude Sonnet guides you through each concept via Socratic dialogue
4. Figures display automatically when referenced
5. Session ends when you've rediscovered all major ideas

## Development

### Local testing

```bash
# Install dependencies
npm install

# Start the backend worker (runs on localhost:8787)
npm run dev

# Open index.html in your browser
# The frontend auto-connects to localhost:8787 when running locally
```

### Deploy

**Frontend** (GitHub Pages):
1. Push to GitHub
2. Enable Pages in settings (main branch, root directory)
3. Add custom domain if desired

**Backend** (Cloudflare Workers):
```bash
npm install -g wrangler
wrangler login
npm run deploy
```

Update `main.js` line 9 to point to your deployed worker URL.

### Project structure

```
readiscover/
├── index.html              Frontend
├── styles.css              All styling + animated background
├── main.js                 Frontend logic + API calls
└── worker/src/
    ├── index.js            Worker entry point + routing
    ├── arxiv-handler.js    Downloads & parses arXiv LaTeX
    ├── llm-client.js       OpenRouter API + all prompts
    ├── session-start.js    Creates new sessions
    └── session-answer.js   Processes user responses
```

## API Reference

### `POST /session/start`
Starts a new learning session.

**Request:**
```json
{
  "arxiv_id": "2401.01234",
  "openrouter_api_key": "sk-or-v1-...",
  "user_knowledge_text": "I know transformers, attention, backprop..."
}
```

**Response:**
```json
{
  "session_id": "uuid-v4",
  "paper_title": "Attention Is All You Need",
  "total_concepts": 6,
  "initial_message": "Welcome! Let's explore this paper..."
}
```

### `POST /session/answer`
Submits your response and gets the next tutor message.

**Request:**
```json
{
  "session_id": "uuid-v4",
  "user_answer": "The attention mechanism computes..."
}
```

**Response:**
```json
{
  "tutor_message": "Great! Now what if we...",
  "current_concept": 3,
  "is_complete": false,
  "figures": [
    {
      "label": "fig:architecture",
      "caption": "The Transformer architecture",
      "format": "pdf",
      "data": "base64-encoded-data"
    }
  ]
}
```

## Technical Details

**LLM Models** (via OpenRouter):
- **Claude Opus 4.5**: Deep paper analysis and concept extraction
- **Claude Sonnet 4.5**: Interactive Socratic dialogue

**Session Management**:
- Stored in-memory on the Cloudflare Worker
- Auto-expires after inactivity
- Completely ephemeral—nothing persists

**Figure Handling**:
- Extracts all figures from LaTeX source
- Converts to base64-encoded data
- Displays when tutor references them (e.g., "see Figure fig:architecture")

## Philosophy

The goal isn't to help you read papers faster—it's to help you understand them deeper. We believe the best learning happens through guided discovery, where you arrive at insights yourself instead of having them handed to you.

That's why the prompts emphasize:
- Starting from first principles
- Mathematical problem formulation
- Socratic questioning
- Never spoiling conclusions
- Building researcher intuition

## Privacy Commitment

- Zero cookies
- Zero analytics
- Zero persistence
- Zero server logs
- Your API key stays in memory during your session and vanishes when done
- No data leaves your browser except API calls to OpenRouter

Built for ~10 trusted researchers at a time. Not a commercial product.

## License

MIT

---

Made with care by [7vik](https://7vik.io)
