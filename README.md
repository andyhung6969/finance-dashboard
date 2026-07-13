# FIRE OS 3.0.3 — Guest Reset Fix

修正內容：

- 訪客模式每次點「先體驗 FIRE OS」都會重新走 Onboarding。
- 訪客模式不沿用舊的 demo localStorage。
- 訪客完成 Onboarding 後，資料只保存在目前分頁 session。
- 登出訪客模式後會清掉當次體驗資料。
- Google / LINE 登入與 Firestore 邏輯不變。

部署方式：把 ZIP 解壓縮後，將內容覆蓋到 GitHub Pages repository 根目錄。


## FIRE OS 3.0.4 - Dashboard Polish

- Desktop: 移除上方 Header 空白區
- Desktop: 同步按鈕移到左側欄設定下方
- Mobile: 資產配置移到淨資產區塊下方
- 保留 3.0.3 穩定登入與 Guest Reset Fix
