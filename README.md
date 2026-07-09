# FIRE OS 2.5.4 — Profile Photo Sync

小修版，只做 Profile 頭貼同步：

- 登入後自動讀取 Firebase Auth `photoURL`
- 支援 Google 頭貼
- 支援 LINE OIDC 頭貼（若 LINE Provider 回傳 picture）
- 將頭貼同步到 Firestore `profile.photoURL`
- Sidebar 顯示同步後的頭貼
- 無頭貼時顯示預設漸層 Avatar

不改 Dashboard / Assets / FIRE / Firestore 資料結構主體。
