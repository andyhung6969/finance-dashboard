# FIRE OS 2.5

Account Linking Edition.

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

## New in 2.5

- Settings page adds Account Linking.
- Link LINE to a Google account, or link Google to a LINE account.
- Uses Firebase `linkWithPopup()` with GoogleAuthProvider and OIDC LINE provider.
- If Google and LINE were already used separately, Firebase may block linking because the credential is already in use; that requires data merge in a later version.
