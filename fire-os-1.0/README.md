# FIRE OS 1.0

Firebase Google Login + Firestore cloud sync version.

## Deploy to GitHub Pages

Upload all files in this folder to your repository root:

- index.html
- assets/css/style.css
- assets/js/app.js

Then Settings > Pages > Deploy from branch > main > /(root).

## Firebase checklist

1. Authentication > Google provider enabled
2. Firestore Database created
3. Firestore Rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Authentication > Settings > Authorized domains add:

```txt
andyhung6969.github.io
```
