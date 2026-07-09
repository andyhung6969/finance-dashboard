# FIRE OS 2.3.3 Demo Stable

Internal demo stable build.

## Goals

- Keep HTML/CSS/JS + GitHub Pages + Firebase
- Login should never block the demo UI
- If Firestore fails, app falls back to Demo Mode
- Home / Assets / Dashboard / Debt / Settings are visible after login
- Assets and debts can be added or edited

## Deploy

Upload all files to the GitHub repository root:

- index.html
- assets/
- manifest.json
- service-worker.js
- README.md

After deployment, open in an incognito/private window if the previous PWA cache is sticky.
