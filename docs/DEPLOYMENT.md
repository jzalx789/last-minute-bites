# 免費主機部署與正式網址

Prototype 0.2 已提供 WSGI 部署入口，但**已取得帳號名稱 Jzalx，目前尚無安全 API 授權，尚未部署，沒有可供教師存取的公開 App URL**。目前的 GitHub 連結是原始碼，不能當作 App 網址。

## Mac 最簡單的安全部署方法

帳號名稱已提供為 **Jzalx**；尚未取得安全 API 授權或完成網站部署。若之前把 Token 貼到聊天，先在 PythonAnywhere 撤銷並重新產生，新的 Token 不要再貼回聊天。

1. 從 GitHub 的 `codex/last-minute-bites-prototype` 分支下載**最新** ZIP，解壓。
2. 雙擊 `Deploy to PythonAnywhere.command`。Python 3.12+ 是唯一的本機需求，無需另外安裝 Git／Gunicorn／框架。
3. 終端機顯示帳號提示時，預設 Jzalx，核對後按 Return。
4. 在該終端機的隱藏輸入欄位貼上**新** API Token，按 Return。它只留在這個程序的記憶體，不寫入檔案、不回傳聊天、不送到 App 網域。
5. 程式只在該帳戶新增 App；遇到其他既有專案會停止。它會上傳版本、設定 HTTPS 與持久 SQLite、要求 reload，並檢查公開網址。
6. 加上本 launcher 的 `--demo` 會透過正常 App API 建立三個合成教師帳戶與七樣食物，驗證共享、配對及 Editor 越權拒絕。正式網址與本次帳密會顯示在你的本機終端機，亦保存於該資料夾的 `.data/deployment/demo-credentials.json`（0600）。請安全提供教師，不提交 GitHub。
7. 若失敗，只把錯誤文字回報，**不要包含 Token**。完整部署尚未在這個新帳戶驗證過；成功 reload 或檔案上傳不等於所有手機測試已完成。

若 macOS 不讓你雙擊 command，使用 Terminal 於專案資料夾執行：

```sh
python3 scripts/deploy_pythonanywhere.py --username Jzalx --apply --ask-token --demo
```

來源 ZIP 不需 Git。使用 Git checkout 時，部署前要求工作區乾淨。程式中有課程測試用帳戶建立操作，不會讀取或覆寫你已有的真實帳戶。

## 建議路徑：PythonAnywhere Beginner

2026-11-07 已查閱官方 [價格與註冊頁](https://www.pythonanywhere.com/pricing/)：有免費 Beginner 帳戶及 SSL。可使用自己的 `帳號.pythonanywhere.com` 網址，SQLite 放在持久的 home 目錄，適合不依賴外部 API 的本課程示範。免費方案有資源與使用限制，須在控制台按平台規則保持 Web app 有效；提交前檢查到期／續用提示。此方案不是正式營運或 SLA 承諾。

1. 使用者自行註冊 US 站點 `www.pythonanywhere.com` 的免費 Beginner 帳戶，記下帳號名稱。
2. 在 PythonAnywhere 的 Account → API Token 產生 token。**不要貼在聊天、GitHub 或文件內。** 在本雲端環境設定安全填入 `PA_API_TOKEN`；`PA_USERNAME` 是可公開的帳號名稱。已建立必要的設定草稿，保存後需重新確認 binding ready。
3. 本機／雲端先檢視計畫（不連主機）：`python3 scripts/deploy_pythonanywhere.py --username YOUR_USERNAME`。
4. 確認帳戶正確、程式碼已提交且工作區乾淨，才執行 `--apply`。新帳戶會建立 Web app，已有其他專案會拒絕修改；已由本腳本建立的同專案版本更新須明確加 `--update`。
5. 程式經官方 HTTPS API 上傳 content-hash release，資料庫固定放在 `/home/USERNAME/.local/share/last-minute-bites/kitchen.sqlite3`，不隨 release 換版消失；設定同源、Secure cookie 與 force_https，最後要求 reload。
6. **API reload 成功不代表 App 已驗收**。以實際公開 HTTPS 網址重試 /healthz、註冊／登入、跨 session 共享、相機許可／拒絕、重開持久化、安裝及離線。再填入提交文件的正式網址與實測記錄。

腳本採用 [官方 API 文件](https://help.pythonanywhere.com/pages/API/) 的 `/files/path`、`/webapps`、`/reload` 介面；只在你提供並授權的帳戶執行。API token 只送往 `www.pythonanywhere.com`，不複製至主機程式或保存的啟動指令。EU 帳戶需要另行設定正確站點與 token allowed destination，不能直接把 token 傳到另一個站點。

若不使用 API：也可將原始碼 ZIP 上傳 PythonAnywhere Files，解壓到 home 中，於 Web 頁建立 Manual configuration／Python 3.12+ 應用，將以下內容放入該 Web app 的 WSGI configuration file，填上自己的路徑與正式網域：

```python
import os, sys
sys.path.insert(0, '/home/YOUR_USERNAME/last-minute-bites')
os.environ['LMB_DB'] = '/home/YOUR_USERNAME/.local/share/last-minute-bites/kitchen.sqlite3'
os.environ['LMB_ORIGIN'] = 'https://YOUR_USERNAME.pythonanywhere.com'
os.environ['LMB_SECURE_COOKIE'] = '1'
from wsgi import application
```

主機管理設定可能變動；以實際控制台及官方文件為準。開啟 force HTTPS，Reload，然後完成上述正式網址驗證。不能把帳號密碼或 token 放入 WSGI 檔。

## 其他獲批的 Python 主機

- 選擇提供 HTTPS、Python WSGI 與持久磁碟的主機。
- 執行 `pip install --require-hashes -r requirements-deploy.txt`。
- 啟動 `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 30 wsgi:application`。
- 設 `LMB_DB`（持久路徑）、`LMB_ORIGIN`（實際 HTTPS origin）及 `LMB_SECURE_COOKIE=1`。
- `deploy/render.yaml` 是**付費 Starter＋持久磁碟的可審閱範例**，本工作沒有建立付費資源，也沒有收費。不要用沒有持久磁碟的免費 ephemeral 服務提交保存帳戶的版本。
- SQLite 只使用單個應用程序／單個共享本地磁碟；擴展至多機不是本 Prototype 的部署方式。

## 教師帳戶與資料

一般資料庫不會內建測試帳戶。可另外執行：

```sh
python3 scripts/seed_demo.py --db .data/demo/kitchen.sqlite3
python3 server.py --db .data/demo/kitchen.sqlite3
```

這會建立 Owner、Editor、無關帳戶與合成食物；隨機帳密在 `.data/demo/demo-credentials.json`（0600）。Mac 使用 `Open Demo on Mac.command` 可自動完成並在終端機顯示合成示範帳密。不要改用已有私人資料的資料庫，腳本也會拒絕覆寫。

如果正式網址使用教師 demo 資料，需在主機上對**全新的獨立 demo 路徑**產生資料、將 LMB_DB 指向它，再安全提供該次產生的帳密。生成新的本機 demo 並不會修改已部署服務的帳戶。不要誤交其他資料庫的密碼。

備份：`python3 scripts/backup.py --db PATH --out NEW_PRIVATE_BACKUP_PATH`。備份包含帳戶／session／私人資料，禁止放入原始碼 ZIP 或公開網址。
