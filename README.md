# FIRE OS 2.6.2 — LIFF Demo Login

這版目標：讓同事在手機 LINE App 內打開 FIRE OS，可以用 LINE 登入體驗 Demo。

## Login 行為

- 手機 / LINE App：使用 LIFF ID `2010658416-sSuwKltu` 取得 LINE profile，進入 FIRE OS Demo Mode。
- 桌機：保留 Firebase LINE OIDC Login 與 Google Login。
- Google Login：維持 Firebase Auth + Firestore。

## 重要限制

LIFF Demo Login 不經過 Firebase Auth / Cloud Functions，因此資料會先存在該裝置的 localStorage，不適合多人正式共用真實財務資料。

正式版手機 LINE Login 仍需要：LIFF + Cloud Functions + Firebase Custom Token。

## 部署

把檔案全部放到 GitHub Pages repository 根目錄覆蓋即可。


## 2.6.2 更新

- Dashboard 改名為「首頁」
- 首頁加入每日輪播語錄
- 保留 LIFF Demo Login
