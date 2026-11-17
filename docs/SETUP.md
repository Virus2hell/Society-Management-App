# Society Manager: Setup, Deployment & Developer Guide

> Looking for the project overview? See the [main README](../README.md).

A React Native (Expo) app that **any housing society** can use. It replaces the
WhatsApp groups and paper registers used for visitors, maintenance bills,
complaints and notices.

**How it works for a new society**
1. The **secretary** signs up and creates the society by entering its name, address
   and building layout. The app generates every flat (A-101 … B-704) and a
   **6-digit join code**.
2. The secretary shares the code on WhatsApp.
3. **Residents** sign up, enter the code and pick their flat. **Watchmen** enter the code only.
4. The secretary gets a notification and **approves or rejects** each request.
5. Once approved, members enter the society. One account can belong to **several
   societies** and switch between them.

| Role | What they can do |
|---|---|
| **Resident** | Approve or deny visitors at the gate, invite guests with a QR gate pass, pay maintenance and download a PDF receipt, raise complaints with photos, read notices |
| **Watchman** | Log walk-in visitors (the flat gets notified), scan QR passes or enter the 6-digit code, allow entry, mark exit, see the visitor log |
| **Secretary** | Create the society, share or regenerate the join code, approve or reject join requests, remove members, dashboard, generate monthly bills, record cash or cheque payments, update complaint status, post notices |

**Tech:** React Native 0.88 · Expo SDK 58 · Expo Router · Axios · Expo Camera (QR scan) · Expo Image Picker · Expo Print and Sharing (PDF) · Expo Notifications · Expo Secure Store · Node.js + Express 5 REST API · **PostgreSQL** (Neon) · JWT auth · multi-tenant data isolation · Multer uploads

---

## The big picture

```
 📱 Phone (Expo app)  ──HTTPS──▶  🖥️ API (Node + Express)  ──SQL──▶  🗄️ PostgreSQL
   mobile/                        backend/   (Render, free)          (Neon, free)
```

| Piece | Where it runs while developing | Where it runs "for real" |
|---|---|---|
| Database | **Neon** (free cloud PostgreSQL), or optionally Postgres on your PC | **Neon** |
| API | Your laptop (`npm run dev`) | **Render** (free web service) |
| App | Expo Go on your phone | **APK** built with EAS, installed on any Android phone |

**Why Neon?** It's free with no expiry and nothing to install. It has a region in
Singapore (close to India), and it's real PostgreSQL. Supabase also works (see the
note in step 1).

---

## 1. Create the database (Neon, 5 minutes, free)

1. Go to **https://neon.tech** → **Sign up** (GitHub or Google login is fine).
2. **Create project**: name `society-app`, Postgres version 16 or 17, **region: AWS Asia Pacific (Singapore)**.
3. On the project dashboard, click **Connect**. Copy the **connection string**. It looks like
   `postgresql://neondb_owner:xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. Keep it secret. It contains the password. Never commit it to GitHub or paste it in chats.

You don't need to create any tables. **The API creates all tables by itself** on
first start (from `backend/src/schema.sql`) and adds the demo society.

> Using **Supabase** instead? Go to Project → **Connect** → copy the *Session pooler*
> URI, and also add `DATABASE_SSL_NO_VERIFY=true` to `.env`.
> Prefer a database on your own PC? Install Docker Desktop, run `docker compose up -d`
> inside `backend/`, and use `postgresql://postgres:postgres@localhost:5432/society`.

## 2. What to install on your computer (one time)

1. **Node.js 20 or newer (LTS)**: https://nodejs.org. Check with `node -v`.
2. **VS Code**: https://code.visualstudio.com
3. **Expo Go** on your phone (Play Store or App Store), latest version (SDK 58).
4. Laptop and phone on the **same Wi-Fi** (only needed while developing).

## 3. Run it in VS Code

Unzip and open the `society-app` folder in VS Code. Open **two terminals**.

### Terminal 1: backend API
```bash
cd backend
npm install
```
Create the `.env` file from the example. On Windows (PowerShell):
```bash
copy .env.example .env
```
On Mac or Linux:
```bash
cp .env.example .env
```
Open `backend/.env` in VS Code and set:
```
DATABASE_URL=<paste your Neon connection string>
JWT_SECRET=<type any long random text>
```
Start the API:
```bash
npm run dev
```
You should see:
```
Empty database: inserted demo data (join code 123456, password 123456).
Society API running on port 4000 (database connected)
  -> http://192.168.1.5:4000  (use this from your phone)
```
Open http://localhost:4000 in your browser. It should say `"database":"connected"`.

### Terminal 2: mobile app
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with Expo Go. Press `w` to also open it in the browser.

### Demo data
The backend creates a demo society, **Shanti Kunj CHS**, with **join code `123456`**.
The password for every demo account is **`123456`**.

| Email | Role |
|---|---|
| secretary@demo.com | Secretary |
| watchman@demo.com | Watchman |
| priya@demo.com | Resident, A-102 |
| rahul@demo.com | Resident, B-201 |
| amit@demo.com | **Pending** join request (A-201). Log in as the secretary to approve it. |

The login screen also has one-tap **Resident / Watchman / Secretary** buttons.

**Try the full new-society flow:**
1. Tap **Create an account**, sign up, then choose **Create a new society**. You land on the dashboard with your join code.
2. Log out, create a second account, choose **Join a society with code**, enter the code and pick a flat.
3. Log back in as the secretary. The dashboard shows "1 join request". Open **Members** and tap **Approve**.
4. Log in as the new resident. You're inside the society.

**Best way to demo:** use the browser (press `w`) for one account and your phone
for another. For example, the watchman logs a visitor in the browser and the
resident's phone gets the notification.

### Reset demo data
This **deletes everything** in the database and inserts the demo data again:
```bash
cd backend
npm run seed
```

### See your data
In Neon, open **Tables** in the left menu to browse the tables (users, societies,
memberships, visitors and so on) and run SQL in the **SQL Editor**, for example:
```sql
SELECT s.name, m.role, m.status, u.email
FROM memberships m
JOIN users u ON u.id = m.user_id
JOIN societies s ON s.id = m.society_id;
```

## 4. If something doesn't work

| Problem | Fix |
|---|---|
| **Any database error** | Run `npm run check-db` in `backend/`. It tests the URL, DNS and login step by step, and tells you the fix. |
| `ENOTFOUND ...neon.tech` | Your Wi-Fi/ISP DNS can't find the database host. The server now **fixes this automatically**: it asks Google/Cloudflare DNS and prints `⚠️ Using public DNS instead`. If even that fails, the connection string is wrong: copy it again from Neon. |
| `DATABASE_URL is not set` | You haven't created `backend/.env`. See step 3. |
| `Could not start the server ... password authentication failed` / `ENOTFOUND` | The connection string is wrong. Copy it again from Neon → Connect. |
| `self-signed certificate` (Supabase) | Add `DATABASE_SSL_NO_VERIFY=true` to `backend/.env`. |
| App says "Server took too long" with the Render URL | The free Render server sleeps after 15 minutes. The first request wakes it (about 50 seconds). Try again. |
| Logged in but stuck on "My societies" | You haven't joined a society yet, or your request is still waiting for the secretary. The screen refreshes by itself every 5 seconds while a request is pending. |
| "Cannot reach the server at http://…:4000" | Make sure Terminal 1 is running. Phone and laptop must be on the same Wi-Fi. On **Windows**, allow "Node.js" through the firewall on **Private networks** (Windows asks the first time; otherwise go to Windows Security → Firewall → Allow an app). |
| Wrong IP detected / using `--tunnel` / college Wi-Fi blocks devices | Create `mobile/.env` with `EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:4000` (find the IP with `ipconfig` on Windows or `ifconfig` on Mac), then restart with `npx expo start -c`. If the Wi-Fi blocks devices from talking to each other, use your phone's hotspot for both. |
| Expo Go says "incompatible SDK" | Update Expo Go from the store. |
| Package version warnings | Run `npx expo install --fix` in the `mobile` folder. |
| Android Expo Go: no remote push | Expected. Google removed remote push from Expo Go. The app polls the API every 6 seconds and shows **local** notifications instead, so everything still works. Real push works in an EAS build (see section 6). |

---

## 5. Put the API online (Render, free)

The APK on a phone can't reach your laptop, so the API needs a public **https** address.

1. Push the project to **GitHub** (the `.gitignore` files keep `.env` and `node_modules` out):
   ```bash
   git init
   ```
   ```bash
   git add .
   ```
   ```bash
   git commit -m "Society Manager: React Native + Express + PostgreSQL"
   ```
   Create an empty repo on github.com, then follow the two commands GitHub shows you (`git remote add …` and `git push`).
2. Go to **https://render.com**, sign in with GitHub, then **New → Blueprint** and pick your repo.
   Render reads `render.yaml` and creates the `society-api` service.
3. When it asks for **DATABASE_URL**, paste the same Neon connection string.
4. Wait for "Live", then open `https://society-api-xxxx.onrender.com`. It should say `"database":"connected"`.

Free Render servers sleep after 15 minutes without traffic, and the first request then takes about 50 seconds.
That's fine for a portfolio project.

## 6. Build the Android app (APK) with EAS

EAS is Expo's cloud build service. Free accounts get enough builds, and you don't need Android Studio.

1. Create a free account at **https://expo.dev**.
2. In `mobile/app.json`, change `"package": "com.example.societymanager"` to something unique,
   for example `com.yourname.societymanager`.
3. In `mobile/eas.json`, replace **both** `https://YOUR-API-NAME.onrender.com` with your Render URL.
4. In a terminal:
   ```bash
   cd mobile
   ```
   ```bash
   npm install -g eas-cli
   ```
   ```bash
   eas login
   ```
   ```bash
   eas init
   ```
   ```bash
   eas build -p android --profile preview
   ```
   `eas init` links the project to your Expo account and adds a `projectId` to `app.json`.
   The build takes about 10–20 minutes. You get a **download link and QR code for the `.apk`**.
5. Open the link on your Android phone, install it (allow "install unknown apps"), and log in with a demo account.

**Build profiles in `eas.json`**
| Profile | What you get | Use it for |
|---|---|---|
| `development` | APK with the Expo dev menu (`expo-dev-client`) that loads JS from your laptop | Developing with real push notifications |
| `preview` | Normal installable APK pointing to your Render API | Testing on phones, sharing with recruiters |
| `production` | `.aab` for the Google Play Store | Publishing |

**Real push notifications** (optional): Android push needs Firebase. Create a Firebase project, add an
Android app with the same package name, download `google-services.json`, then run
`eas credentials` → Android → upload the FCM V1 service account key. Without this, the app
still works: it polls the API and shows notifications while it's open.

### Test checklist on the phone
- [ ] Sign up → create a society → share code on WhatsApp
- [ ] Second phone or browser: sign up → join with code → secretary approves → enters society
- [ ] Watchman logs a visitor → resident gets a notification → approves → watchman allows entry
- [ ] Resident creates a guest pass → watchman **scans the QR with the camera**
- [ ] Complaint with a **camera photo** → secretary sees the photo → marks resolved
- [ ] Pay a bill → **download the PDF receipt** → share it
- [ ] Close the app, reopen it → still logged in, same society

## 7. Project structure (what every file does)

```
society-app/
├── README.md                     ← this file
├── render.yaml                   ← one-click deploy of the API on Render
├── backend/                      ← Node.js + Express REST API
│   ├── package.json              ← scripts: dev / start / seed, and dependencies
│   ├── .env.example              ← copy to .env: DATABASE_URL, JWT_SECRET, PORT, SEED_DEMO
│   ├── docker-compose.yml        ← optional: local PostgreSQL with Docker
│   └── src/
│       ├── server.js             ← loads .env, creates tables, seeds if empty, mounts routes, starts Express
│       ├── schema.sql            ← ALL tables: users, societies, memberships, visitors, bills,
│       │                           complaints, notices, notifications, photos (+ indexes, constraints)
│       ├── db.js                 ← PostgreSQL pool (pg): query(), one(), tx() transactions, migrate();
│       │                           converts snake_case columns to camelCase JSON
│       ├── seed.js               ← demo society (code 123456) + 5 users; `npm run seed` wipes and re-seeds
│       ├── flats.js              ← turns wings + floors + flats per floor into A-101, A-102 … B-704
│       ├── codes.js              ← unique random 6-digit codes (society join code, guest pass)
│       ├── auth.js               ← JWT, requireAuth, requireMember (X-Society-Id header), requireRole
│       ├── notify.js             ← saves in-app notifications + Expo push to a flat / role / whole society
│       └── routes/
│           ├── auth.js           ← POST /signup, POST /login, GET /me (user + all memberships), PUT /push-token
│           ├── societies.js      ← create society (transaction), look up a code, request to join, cancel / leave
│           ├── society.js        ← CURRENT society: info, regenerate code, approve/reject requests,
│           │                       members, remove member, dashboard (COUNT ... FILTER queries)
│           ├── visitors.js       ← walk-in entry, approve/deny, pre-approve (QR code), verify, check-in/out
│           ├── bills.js          ← list, generate for all flats (one INSERT … ON CONFLICT DO NOTHING), pay
│           ├── complaints.js     ← create with photo, list, detail, status update (JSONB history)
│           ├── photos.js         ← serves complaint photos stored in the database
│           ├── notices.js        ← list, post (notifies everyone), delete
│           └── notifications.js  ← in-app notification feed (the app polls this), mark all read
│
└── mobile/                       ← Expo / React Native app
    ├── app.json                  ← app name, Android package id, icons, permissions
    ├── eas.json                  ← build profiles: development / preview (APK) / production (Play Store)
    ├── package.json              ← "main": "expo-router/entry" and dependencies
    ├── .env.example              ← optional EXPO_PUBLIC_API_URL override
    ├── assets/                   ← app icon and splash images
    └── src/
        ├── theme.js              ← colors, spacing, radius (the simple blue/white theme)
        ├── api/
        │   ├── config.js         ← finds the backend URL automatically from Expo's host IP (port 4000)
        │   └── client.js         ← Axios instance, adds JWT + X-Society-Id to every request, errorMessage(), uploadForm()
        ├── context/
        │   ├── AuthContext.js    ← login / signup / logout, memberships, current society (activeMembership),
        │   │                       selectSociety(), saves token + last society in SecureStore
        │   └── NotificationContext.js ← polls notifications, local alerts, bell count, tap → switches to
        │                               that society and opens the screen
        ├── hooks/
        │   └── useApi.js         ← load data when a screen opens, optional auto-refresh, reloads on society switch
        ├── utils/
        │   ├── format.js         ← ₹ Indian money format, dates, "5 min ago"
        │   ├── receipt.js        ← builds the HTML receipt → PDF (expo-print) → share sheet
        │   ├── notifications.js  ← permission, Android channel, push token, local notification
        │   └── storage.js        ← SecureStore on phone, localStorage on web
        ├── components/           ← reusable UI pieces
        │   ├── Button.js         ← primary / outline / success / danger buttons with loading spinner
        │   ├── TextField.js      ← label + input
        │   ├── Card.js           ← white rounded box (tappable if onPress)
        │   ├── StatusBadge.js    ← colored pill: Waiting, Approved, Paid, Open, Resolved…
        │   ├── OptionPicker.js   ← chips to pick flat / purpose / category
        │   ├── StatCard.js       ← dashboard number tile
        │   ├── EmptyState.js     ← "nothing here" message
        │   ├── ErrorBanner.js    ← red error strip
        │   ├── Loader.js         ← full-screen spinner
        │   ├── HeaderActions.js  ← switch society, bell with unread count, logout
        │   ├── HeaderTitle.js    ← screen title + current society name under it
        │   ├── RoleTabs.js       ← bottom tabs + guard (no society → /societies, wrong role → redirected)
        │   ├── VisitorCard.js    ← visitor row used by resident and watchman screens
        │   ├── ComplaintCard.js  ← complaint row → opens detail
        │   └── NoticeList.js     ← notice board list (secretary can post/delete)
        └── app/                  ← Expo Router: every file is a screen, folder = URL
            ├── _layout.js        ← root: providers, waits for saved login, stack screen titles
            ├── index.js          ← redirects to /login, /societies, or /resident | /watchman | /secretary
            ├── login.js          ← email + password login, demo buttons
            ├── signup.js         ← create an account (name, email, password)
            ├── societies.js      ← "My societies": open / switch, pending requests, join or create
            ├── notifications.js  ← list of notifications
            ├── society/
            │   ├── create.js     ← secretary creates a society (layout → flats preview)
            │   └── join.js       ← enter code → see society → Resident (pick flat) or Watchman → request
            ├── resident/
            │   ├── _layout.js    ← resident bottom tabs
            │   ├── index.js      ← home: amount due, guests, complaints, latest notice
            │   ├── visitors.js   ← approve/deny visitors at the gate (refreshes every 5s), history
            │   ├── dues.js       ← bills, Pay now (demo UPI/Card), PDF receipt
            │   ├── complaints.js ← my complaints + raise new
            │   └── notices.js    ← notice board
            ├── watchman/
            │   ├── _layout.js    ← watchman bottom tabs
            │   ├── index.js      ← log new visitor, live waiting / approved / denied lists
            │   ├── scan.js       ← QR scanner (expo-camera) + manual 6-digit code
            │   ├── log.js        ← inside now / today / all, Mark exit
            │   └── notices.js    ← notice board
            ├── secretary/
            │   ├── _layout.js    ← secretary bottom tabs
            │   ├── index.js      ← dashboard: join code (share / regenerate), join request alert, collection
            │   ├── dues.js       ← generate bills, month filter, collected vs pending, record cash
            │   ├── complaints.js ← all complaints with status filter
            │   ├── notices.js    ← notice board with post / delete
            │   └── members.js    ← join requests (approve / reject) + members (remove)
            ├── visitor/
            │   ├── preapprove.js ← invite guest form (name, purpose, date)
            │   └── pass/[id].js  ← QR gate pass + share with guest
            ├── complaint/
            │   ├── new.js        ← raise complaint with camera/gallery photo
            │   └── [id].js       ← complaint detail + timeline, secretary updates status
            └── notice/
                └── new.js        ← secretary posts a notice
```

### How the main flows work
- **Database design:** every table that belongs to a society has a `society_id` foreign key
  (`ON DELETE CASCADE`). Rules live in the database too: `UNIQUE (user_id, society_id)` (one membership
  per person per society), `UNIQUE (society_id, flat, month)` (no duplicate bills), and `CHECK` constraints on
  every status column. Status changes use `UPDATE ... WHERE status = 'pending'`, so two people tapping
  at the same moment can't both succeed.
- **Multi-society (multi-tenancy):** an *account* (users table) is just a person.
  A *membership* links an account to a society with a role (secretary, resident or watchman),
  a flat and a status (pending, approved, rejected, removed or left). Every visitor, bill,
  complaint and notice row has a `societyId`. The app sends the current society in an
  `X-Society-Id` header, and the `requireMember` middleware checks that you are an
  **approved** member of that society before any route runs. Every query is filtered by
  that society, so one society can never see another's data.
- **Joining:** `GET /societies/lookup/:code` shows which society the code belongs to. `POST /societies/join`
  creates a `pending` membership and notifies the secretaries. `POST /society/requests/:id/decide`
  approves or rejects it and notifies the person, whose app refreshes their memberships automatically.
- **Walk-in visitor:** the watchman calls `POST /api/visitors`, which sets the status to `pending`, notifies the flat's residents and adds the visitor to the resident's Visitors tab. The resident calls `POST /visitors/:id/respond`, which sets `approved` or `denied` and notifies the watchman. The watchman taps **Allow entry** (`inside`), then **Mark exit** (`exited`).
- **Guest QR pass:** the resident calls `POST /visitors/preapprove`, which returns a 6-digit code. The app shows a QR of `SOCIETYPASS:<code>`. The watchman scans it, `POST /visitors/verify` checks it's valid today, marks the guest `inside`, and notifies the resident.
- **Maintenance:** the secretary generates bills for all flats and residents are notified. A resident pays (demo payment) and gets a PDF receipt through `expo-print` and the share sheet.
- **Notifications:** every server event is saved in the `notifications` table. The app polls it every 6 seconds and shows a phone notification, so this works even in Expo Go. In a development or release build it also sends real Expo push notifications.

---

## 8. Ideas for later
- **Real payments:** replace the demo payment in `resident/dues.js` with Razorpay.
- **More admin features:** co-secretaries (chairman, treasurer), rate limiting on code lookups, email OTP login.
- **Automated tests:** Jest + Supertest for the API, run on GitHub Actions.
