# Readiscover

**Rediscover research papers through guided deep learning**

Readiscover is a web application that helps researchers deeply understand arXiv papers by guiding them through an interactive, question-driven rediscovery of the paper's ideas using LLMs.

## Features

- 🎓 **Deep Paper Understanding**: Analyzes complete LaTeX source code including nested files
- 🖼️ **Figure-Aware Learning**: Integrates paper figures directly into the learning experience
- 🤖 **Adaptive Tutoring**: Uses Claude Opus 4.5 for detailed analysis and Claude Sonnet 4.5 for interactive dialogue
- 🎨 **Beautiful Interface**: Distill.pub-inspired design with warm academic aesthetic
- 🔒 **Privacy First**: No data persistence, no accounts, no analytics - everything is ephemeral

## Architecture

### Frontend
- Static single-page application (HTML/CSS/Vanilla JS)
- Hosted on GitHub Pages
- MathJax v3 for LaTeX rendering
- PDF.js for figure display

### Backend
- Cloudflare Worker
- In-memory session management
- arXiv source fetching and parsing
- OpenRouter integration for LLM calls

## Setup

### Prerequisites

- Node.js v18+
- Cloudflare account
- OpenRouter API key (users provide their own)

### Installation

```bash
# Install dependencies
npm install

# Development
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### Frontend Deployment (GitHub Pages)

1. Push the repository to GitHub
2. Enable GitHub Pages in repository settings
3. Set source to `main` branch, root directory
4. Configure custom domain: `readiscover.7vik.io`

### Backend Deployment (Cloudflare Worker)

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`
3. Deploy: `npm run deploy`
4. Configure custom domain in Cloudflare dashboard: `api.readiscover.7vik.io`

## Configuration

### DNS Setup

Add the following DNS records:

```
readiscover.7vik.io     CNAME    <github-pages-domain>
api.readiscover.7vik.io CNAME    <cloudflare-worker-domain>
```

### Environment Variables

No environment variables needed! Users provide their own OpenRouter API keys.

## Usage

1. Visit https://readiscover.7vik.io
2. Enter an arXiv paper URL or ID (e.g., `2401.01234`)
3. Enter your OpenRouter API key
4. Customize your existing knowledge
5. Click "Begin Readiscovery"
6. Engage with the interactive dialogue to rediscover the paper

## API Endpoints

### POST `/session/start`

Start a new learning session.

**Request:**
```json
{
  "arxiv_id": "2401.01234",
  "openrouter_api_key": "sk-or-v1-...",
  "user_knowledge_text": "I already know about..."
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "paper_title": "Paper Title",
  "total_concepts": 5,
  "initial_message": "Welcome! Let's begin..."
}
```

### POST `/session/answer`

Submit an answer and get tutor response.

**Request:**
```json
{
  "session_id": "uuid",
  "user_answer": "I think..."
}
```

**Response:**
```json
{
  "tutor_message": "Great insight! Let me follow up...",
  "current_concept": 2,
  "is_complete": false,
  "figures": [...]
}
```

## Development

### Project Structure

```
readiscover/
├── index.html              # Frontend HTML
├── styles.css              # Frontend styles
├── main.js                 # Frontend JavaScript
├── worker/
│   └── src/
│       ├── index.js        # Worker entry point
│       ├── arxiv-handler.js    # arXiv fetching & parsing
│       ├── llm-client.js   # OpenRouter integration
│       ├── session-start.js    # Session initialization
│       └── session-answer.js   # Answer processing
├── package.json
├── wrangler.toml           # Cloudflare config
└── README.md
```

### Testing Locally

1. Start the worker: `npm run dev`
2. Open `index.html` in a browser
3. The frontend will automatically connect to `localhost:8787`

## LLM Models

- **Summarizer**: `anthropic/claude-opus-4.5` - Full detailed paper analysis
- **Dialogue**: `anthropic/claude-sonnet-4.5` - Interactive tutoring

Both accessed via OpenRouter API.

## Privacy & Security

- ✅ No cookies
- ✅ No analytics
- ✅ No persistence
- ✅ No logs
- ✅ All data destroyed at session end
- ✅ API keys never stored or logged

## Target Users

~10 trusted researchers at a time. Each provides their own OpenRouter API key.

## License

MIT

## Contributing

This is a personal project for a small group of researchers. Not accepting contributions at this time.

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for deep research understanding
