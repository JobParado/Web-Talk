# WebTalk 💬

A real-time, dark-themed web chat application built with vanilla JavaScript and Supabase. WebTalk lets users sign up, add friends, and exchange messages and media — all in a responsive three-panel layout that works on desktop, tablet, and mobile as a PWA.

> **Live repo:** https://github.com/JobParado/Web-Talk

---

## Features

- **Email & Google sign-in** via Supabase Auth, with email confirmation flow
- **Real-time messaging** — text, images, video, audio, and document attachments
- **Friend system** — search users, send/accept/decline/cancel friend requests, unfriend
- **Live presence** — green/grey indicator shows when a friend is online
- **Username management** — change your display name from the Settings tab (max 16 chars)
- **Image compression** — client-side compression via `browser-image-compression` before upload
- **Message deletion** — long-press (1.5 s) your own messages to delete them (removes file from storage too)
- **Shimmer skeleton** — loading placeholders while the chat list fetches
- **Progressive Web App** — service worker, web manifest, installable on Android & iOS
- **Safe-area support** — `env(safe-area-inset-bottom)` keeps the input bar above iPhone home indicators

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS (ES Modules) |
| UI Framework | Bootstrap 5 + Bootstrap Icons |
| Backend / DB | [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage |
| Build Tool | [Vite](https://vitejs.dev) v8 (multi-page) |
| Image Compression | [`browser-image-compression`](https://www.npmjs.com/package/browser-image-compression) |

## Project Structure

```
├── index.html              # Sign-in page
├── create.html             # Registration page
├── homePage.html           # Main app shell (Chats / Friends / Settings)
├── vite.config.js          # Multi-page Vite config
├── public/
│   ├── sw.js               # Service worker (cache-first strategy)
│   └── site.webmanifest    # PWA manifest
├── css/
│   ├── LoginCreate.css     # Auth page styles
│   ├── homepage.css        # Layout, responsive breakpoints
│   ├── homepage2.css       # Component dark-theme styles
│   └── skeleton.css        # Shimmer loading animation
└── src/
    ├── homePage.js         # Core app logic — messaging, friends, presence, file uploads
    ├── config/
    │   └── supabaseClient.js
    ├── account/
    │   ├── loginEmail.js
    │   ├── loginGoogle.js
    │   ├── registerEmail.js
    │   └── account.js      # Username update, support messages, account deletion requests
    └── fetchData/
        ├── fetchUsers.js   # Fetch all users excluding self and already-connected
        └── friendLists.js  # DOM renderers for chat list, friends list, search results, requests
```

## Getting Started

### Prerequisites

- Node.js **≥ 20** (required by Vite 8 and Supabase JS)
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/JobParado/Web-Talk.git
cd Web-Talk
npm install
```

### 2. Set up environment variables

Create a `.env` file at the project root (already in `.gitignore`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Configure Supabase

Create the following tables in your Supabase project:

| Table | Key columns |
|---|---|
| `profiles` | `id` (uuid, FK → auth.users), `email`, `username`, `status` (bool) |
| `friends` | `id`, `user_id`, `friend_id`, `status` (`pending` / `accepted`) |
| `messages` | `id`, `conversation_id`, `sender_id`, `receiver_id`, `message`, `type`, `file_path`, `file_name`, `storage_path` |
| `support` | `user_id`, `user_email`, `message` |
| `account deletion requests` | `user_id`, `user_email`, `message` |

Also configure:

- **Auth providers** — Email (with confirmation) and Google OAuth
- **Realtime** — enable on `profiles`, `friends`, and `messages`
- **Storage bucket** — create `chat_files` (public read, authenticated write)
- **Row Level Security** — users should only read/write their own rows

> [!NOTE]
> On first login the app auto-creates a `profiles` row and derives the default username from the email address (the part before `@`).

### 4. Run the dev server

```bash
npm run dev
```

Vite opens `index.html` automatically. The three entry points are `index.html`, `create.html`, and `homePage.html`.

### 5. Build for production

```bash
npm run build   # outputs to dist/
npm run preview # preview the production build locally
```

## File Upload Limits

| Type | Max size | Notes |
|---|---|---|
| Images | 20 MB raw | Compressed to ≤ 1 MB before upload |
| Video | 25 MB | Streamed via `<video>` element |
| Audio | 15 MB | Streamed via `<audio>` element |
| Documents | 15 MB | PDF, Word, Excel, PowerPoint, CSV, TXT, etc. |

Executable files (`.exe`, `.bat`, `.cmd`, `.sh`, `.msi`, `.com`, `.scr`, `.vbs`) are blocked client-side before upload.

## Responsive Layout

| Breakpoint | Layout |
|---|---|
| ≥ 1726 px | Three-column: sidebar-left · middle · sidebar-right (70%) |
| 769–1725 px | Tablet: compressed columns, fluid widths |
| ≤ 768 px | Mobile: single-panel view; opening a chat slides to the message pane; close button returns to the list |

## PWA

The service worker (`public/sw.js`) uses a **network-first, cache-fallback** strategy and caches the three HTML shells plus icons. The cache is versioned (`webtalk-v3`) and stale caches are pruned on activation.