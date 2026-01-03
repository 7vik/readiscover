# Quick Start Guide

Get Readiscover running locally in 5 minutes.

## Prerequisites

- Node.js v18+ installed
- An OpenRouter API key (get one at https://openrouter.ai)
- A test arXiv paper ID (e.g., `2401.01234`)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Backend Worker

```bash
npm run dev
```

You should see:
```
⛅️ wrangler 3.x.x
------------------
⎔ Starting local server...
🌀 Ready on http://localhost:8787
```

### 3. Open the Frontend

In a new terminal or simply open in your browser:

```bash
open index.html
```

Or navigate to the file in your browser:
```
file:///Users/yourusername/Desktop/readiscover/index.html
```

### 4. Test with a Paper

1. Enter an arXiv ID: `2401.01234` (or any valid arXiv paper)
2. Enter your OpenRouter API key
3. Edit your existing knowledge (optional)
4. Click "Begin Readiscovery"

The frontend will connect to your local worker at `http://localhost:8787`.

## Testing Different Papers

Try these interesting arXiv papers:

- **Transformers**: `1706.03762` - Attention is All You Need
- **GPT-3**: `2005.14165` - Language Models are Few-Shot Learners
- **ResNet**: `1512.03385` - Deep Residual Learning
- **CLIP**: `2103.00020` - Learning Transferable Visual Models

## Development Workflow

### Frontend Changes

Edit `index.html`, `styles.css`, or `main.js` and refresh your browser.

### Backend Changes

1. Edit files in `worker/src/`
2. The worker will auto-reload
3. Refresh frontend to see changes

### Live Debugging

Watch worker logs in real-time:

```bash
npx wrangler tail
```

In another terminal, make requests and see logs appear.

## Common Issues

### "Failed to start session"

- Check that the worker is running (`npm run dev`)
- Verify your OpenRouter API key is valid
- Ensure the arXiv ID exists and has source files available

### CORS Errors

The worker includes CORS headers for `*` origin during development. If you see CORS errors:

1. Check browser console for specific error
2. Verify worker is running on port 8787
3. Ensure `API_BASE_URL` in main.js is correct

### "arXiv source not available"

Some papers don't have LaTeX source available. Try a different paper or check:

```bash
curl -I https://arxiv.org/src/YOUR_ARXIV_ID
```

If you get a 404, the source isn't available for that paper.

## Project Structure

```
readiscover/
├── index.html           # Landing page & UI
├── styles.css           # Beautiful Distill-inspired styles
├── main.js             # Frontend logic & API calls
├── worker/src/
│   ├── index.js        # Router & CORS
│   ├── arxiv-handler.js    # Fetch & parse arXiv
│   ├── llm-client.js   # OpenRouter integration
│   ├── session-start.js    # Initialize session
│   └── session-answer.js   # Process dialogue
└── spec.txt            # Full specification
```

## Next Steps

- Read `spec.txt` for complete project requirements
- See `README.md` for architecture details
- Check `DEPLOYMENT.md` for production deployment

## Tips

1. **Start simple**: Test with a short paper first
2. **Customize knowledge**: The more specific your background, the better the tutor adapts
3. **Use real questions**: The dialogue engine works best with genuine curiosity
4. **Check figures**: When the tutor references figures, they should appear in the chat

## Getting an OpenRouter API Key

1. Visit https://openrouter.ai
2. Sign up for an account
3. Go to API Keys section
4. Create a new key
5. Add credits to your account (pay-as-you-go)

**Cost estimate**: ~$0.10-0.50 per paper session depending on length and interaction.

## Development Tips

### Quick Frontend Iteration

Use a local server for better development experience:

```bash
# Option 1: Python
python3 -m http.server 8000

# Option 2: Node
npx serve .

# Option 3: VS Code Live Server extension
```

Then visit `http://localhost:8000`

### Worker Testing

Test endpoints directly with curl:

```bash
# Health check
curl http://localhost:8787/health

# Start session (replace with your API key)
curl -X POST http://localhost:8787/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "arxiv_id": "2401.01234",
    "openrouter_api_key": "sk-or-v1-...",
    "user_knowledge_text": "I know about transformers"
  }'
```

---

**Happy rediscovering!** 🎓
