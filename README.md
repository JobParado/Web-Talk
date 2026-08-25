<img src="public/images/favicon_io/android-chrome-512x512.png" alt="WebTalk logo" width="96">

# WebTalk 💬

[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com)

> A real-time chat app built with vanilla JavaScript, Vite, and Supabase — no custom backend server required.

WebTalk handles authentication, friend management, live presence, and rich media messaging inside a responsive, installable multi-panel interface. The client talks to Supabase directly, with Row Level Security policies deciding who can see and change what.

> [!WARNING]
> Account sign-ups are currently disabled. Sign-in only.

## Features

- **Authentication** — email/password and Google sign-in via Supabase Auth
- **Friend system** — send, accept, decline, cancel, and remove friend requests, with database constraints that prevent duplicate or self-directed requests
- **Real-time messaging** — messages, friend requests, and profile changes sync instantly through Supabase Realtime
- **Live presence** — see when a friend is currently online
- **Rich media sharing** — images (compressed client-side before upload), video, audio, and documents
- **Account controls** — change your username, contact support, or request account deletion
- **Installable PWA** — offline-friendly caching via a service worker, with safe-area handling for mobile devices

## Architecture

There's no custom API layer — WebTalk is a static frontend that talks to Supabase directly from the browser.

```text
Browser (Vanilla JS + Vite)
   │
   └── Supabase
        ├── Auth       → email/password + Google sign-in
        ├── Postgres   → profiles, friends, messages, support requests
        ├── Realtime   → live messages, presence, friend & profile updates
        └── Storage    → chat media and documents (chat_files bucket)
```

Authentication controls access to user data, and Row Level Security policies on every table enforce ownership at the database level — a user can only read or change rows they're actually a party to.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript (ES modules) |
| Build tool | Vite 8 (multi-page setup) |
| Backend | Supabase — Auth, Postgres, Realtime, Storage |
| UI | Bootstrap 5, Bootstrap Icons |
| Utilities | browser-image-compression |

## Project structure

```text
.
├── index.html               # Login page
├── create.html               # Registration page
├── homePage.html            # Main app: chats / friends / settings tabs
├── src/
│   ├── homePage.js          # Messaging, friends, presence, uploads
│   ├── account/
│   │   ├── account.js       # Username changes, support, account deletion
│   │   ├── loginEmail.js
│   │   ├── loginGoogle.js
│   │   └── registerEmail.js
│   ├── config/
│   │   └── supabaseClient.js
│   └── fetchData/
│       ├── fetchUsers.js
│       └── friendLists.js
├── css/
├── public/
│   ├── images/favicon_io/
│   ├── site.webmanifest
│   └── sw.js                # Service worker
├── supabase/
│   ├── config.toml
│   └── migrations/          # Database schema
└── vite.config.js
```

## Getting started

### Prerequisites

- Node.js 20.19+ or 22.12+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/JobParado/Web-Talk.git
cd Web-Talk
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> [!WARNING]
> Never commit `.env.local` or any file containing real credentials — it's already covered by `.gitignore`.

### 3. Run the app

```bash
npm run dev
```

Vite opens `index.html` by default. The app uses three entry pages: `index.html` (login), `create.html` (registration), and `homePage.html` (the app itself, once signed in).

### 4. Build for production

```bash
npm run build
npm run preview
```

## Supabase setup

> [!IMPORTANT]
> WebTalk has no backend of its own — it won't run until your Supabase project has the schema, auth providers, and storage bucket below in place.

The SQL under `supabase/migrations/` defines the full schema and can be applied with the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), or recreated by hand.

**Database tables**

| Table | Purpose |
| --- | --- |
| `profiles` | User profile info — `email`, `username`, `status` (used to disable an account) |
| `friends` | Friend relationships — `user_id`, `friend_id`, `status` (`pending` / `accepted` / `rejected` / `blocked`) |
| `messages` | Chat messages and file metadata, keyed by `conversation_id` |
| `support` | Messages submitted through **Contact Support** |
| `account deletion requests` | Requests submitted through **Request Account Deletion** |

All tables have Row Level Security enabled, and `friends` has unique constraints that block duplicate active relationships and self-friending at the database level.

**Authentication** — enable the **Email** and **Google** providers in the Supabase dashboard.

**Realtime** — enable it for the `profiles`, `friends`, and `messages` tables so the UI updates instantly instead of polling. Live presence (the online/offline indicator) works automatically once Realtime is enabled on the project.

**Storage** — create a private bucket named `chat_files`. Uploaded media is served through short-lived signed URLs rather than public links.

## Messaging & file limits

Besides images, video, and audio, WebTalk accepts PDFs, Office documents, plain text, and Apple iWork files.

| Type | Limit |
| --- | --- |
| Images | 20 MB raw, compressed client-side before upload |
| Video | 25 MB |
| Audio & documents | 15 MB |

Executable and script files (`.exe`, `.bat`, `.cmd`, `.sh`, `.msi`, `.com`, `.scr`, `.vbs`) are rejected before upload. Signed URLs expire after an hour, and long-pressing your own message deletes it, including the underlying file in storage.

## PWA

WebTalk registers a service worker (`sw.js`) that caches core assets and serves them network-first, falling back to the cache when offline. The cache is versioned, and old caches are cleared automatically whenever a new version activates.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build production assets |
| `npm run preview` | Preview the production build locally |

## Acknowledgments

- [Supabase](https://supabase.com) — authentication, database, realtime, and storage backend
- [Vite](https://vitejs.dev) — build tooling and dev server
- [Bootstrap](https://getbootstrap.com) — UI components and icons
- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) — client-side image compression before upload