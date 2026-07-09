# FIRE OS 2.4

LINE Login Edition.

## New

- LINE Login button added as primary login.
- Google Login remains as backup.
- Firebase OIDC provider id: `oidc.oidc.line`.
- Keeps FIRE OS 2.3 responsive desktop/mobile layout, PWA, Firestore sync, data management.

## Deploy

Upload everything in this folder to the GitHub repository root:

- index.html
- manifest.json
- service-worker.js
- assets/
- README.md

## Firebase prerequisites

- Google provider enabled.
- OIDC provider enabled with provider ID `oidc.oidc.line`.
- LINE Developers Callback URL set to `https://fire-dashboard-86bb9.firebaseapp.com/__/auth/handler`.
