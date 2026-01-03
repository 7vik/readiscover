READISCOVER — STEP-BY-STEP EXECUTION CHECKLIST
(From current state → fully live system)

✅ COMPLETED: All code has been generated!
- Frontend: index.html, styles.css, main.js
- Backend: worker/src/* (5 files)
- Docs: README.md, DEPLOYMENT.md, QUICKSTART.md
- Config: package.json, wrangler.toml

────────────────────────────────────────
PHASE 0 — VERIFY LOCAL SETUP (5 minutes)
────────────────────────────────────────

[ ] 1. Run the setup verification script:
       ./test-local.sh

       This checks:
       - Node.js installed
       - Dependencies installed
       - All files present

[ ] 2. If test passes, continue to Phase 1
       If test fails, install missing items

────────────────────────────────────────
PHASE 1 — TEST LOCALLY (10 minutes)
────────────────────────────────────────

[ ] 3. Start the Cloudflare Worker locally:
       npm run dev

       You should see:
       "Ready on http://localhost:8787"

[ ] 4. In a new terminal, test the health endpoint:
       curl http://localhost:8787/health

       Expected: {"status":"ok","service":"readiscover-api"}

[ ] 5. Open the frontend in your browser:
       open index.html

       (Or manually navigate to the file)

[ ] 6. Test with a real paper:
       - Enter arXiv ID: 2401.01234
       - Enter your OpenRouter API key
       - Click "Begin Readiscovery"

       Verify:
       - Loading steps appear
       - Paper title loads
       - Initial tutor message appears
       - You can send responses

[ ] 7. If everything works locally, continue to Phase 2
       If errors occur, check browser console and worker logs

────────────────────────────────────────
PHASE 2 — DEPLOY FRONTEND (GitHub Pages)
────────────────────────────────────────

[ ] 8. Commit and push to GitHub:
       git add .
       git commit -m "Initial Readiscover implementation"
       git push origin main

[ ] 9. Configure GitHub Pages:
       - Go to your repo on GitHub
       - Settings → Pages
       - Source: main branch
       - Folder: / (root)
       - Click Save

[ ] 10. Wait for deployment:
        GitHub will show a URL like:
        https://7vik.github.io/readiscover

────────────────────────────────────────
PHASE 3 — FRONTEND DNS (WordPress.com)
────────────────────────────────────────

[ ] 11. Add DNS record in WordPress.com:
        - My Site → Upgrades → Domains → 7vik.io
        - DNS Records → Add record
        - Type: CNAME
        - Name: readiscover
        - Value: 7vik.github.io
        - TTL: Auto
        - Save

[ ] 12. Configure custom domain in GitHub:
        - Back in GitHub Pages settings
        - Custom domain: readiscover.7vik.io
        - Save

[ ] 13. Wait for DNS verification:
        - Wait until "DNS check successful" appears
        - Then enable: ☑ Enforce HTTPS

[ ] 14. Verify frontend is live:
        Open: https://readiscover.7vik.io

────────────────────────────────────────
PHASE 4 — DEPLOY BACKEND (Cloudflare Worker)
────────────────────────────────────────

[ ] 15. Deploy using Wrangler CLI:
        npm run deploy

        (This uses the wrangler.toml config to deploy the worker)

[ ] 16. Note the Worker URL:
        Wrangler will show:
        https://readiscover-api.<random>.workers.dev

[ ] 17. Test the deployed worker:
        curl https://readiscover-api.<random>.workers.dev/health

────────────────────────────────────────
PHASE 5 — BACKEND DNS (WordPress.com → Cloudflare)
────────────────────────────────────────

[ ] 18. Add backend DNS record:
        In WordPress.com DNS for 7vik.io:
        - Type: CNAME
        - Name: api.readiscover
        - Value: readiscover-api.<random>.workers.dev
        - TTL: Auto
        - Save

[ ] 19. Add custom domain in Cloudflare:
        - In Cloudflare dashboard → Workers
        - Select your worker: readiscover-api
        - Settings → Triggers → Custom Domains
        - Add: api.readiscover.7vik.io
        - Save

────────────────────────────────────────
PHASE 6 — CONNECT FRONTEND TO BACKEND
────────────────────────────────────────

[ ] 20. Verify API URL in frontend:
        Check main.js has:
        https://api.readiscover.7vik.io

        (Already configured! No changes needed)

[ ] 21. If you made any changes, redeploy:
        git commit -am "Update backend API URL"
        git push origin main

────────────────────────────────────────
PHASE 7 — FINAL VERIFICATION
────────────────────────────────────────

[ ] 22. Open production site:
        https://readiscover.7vik.io

[ ] 23. Test complete workflow:
        - Enter arXiv ID (try: 2401.01234)
        - Enter your OpenRouter API key
        - Click "Begin Readiscovery"

[ ] 24. Verify all features work:
        ✓ Loading stages appear
        ✓ Paper title loads correctly
        ✓ Initial tutor message appears
        ✓ Math equations render (MathJax)
        ✓ You can send responses
        ✓ Progress updates correctly
        ✓ Figures display when referenced
        ✓ Session completes cleanly

────────────────────────────────────────
PHASE 8 — DONE
────────────────────────────────────────

🎉 You now have:
- A live research-grade tool
- Zero servers
- Zero persistence
- Clean domain separation
- Minimal operational overhead

If something breaks:
- Frontend issues → GitHub Pages
- Backend issues → Cloudflare Worker logs (use: wrangler tail)

OPTIONAL NEXT STEPS
- Tune prompts for better pedagogy
- Add figure thumbnails
- Add concept graph visualization
- Add "difficulty" slider

END OF CHECKLIST