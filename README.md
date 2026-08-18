# WebTalk

WebTalk is a real-time chat application built entirely with vanilla JavaScript, Vite, and Supabase — no frontend framework required. It handles authentication, friend management, live presence, and rich media messaging inside a responsive multi-panel interface.

## Highlights

- Supabase Auth (email/password + Google sign-in)
- Real-time message delivery via Supabase Realtime
- Full friend request workflow — send, accept, decline, cancel, unfriend
- Live presence indicators showing who's online
- Media sharing: images, video, audio, and documents
- Client-side image compression before upload, to keep transfers fast
- Installable as a PWA with offline-friendly caching

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, Vanilla JS (ES modules) |
| Build Tool | Vite 8 (multi-page setup) |
| Backend | Supabase (Auth, Postgres, Realtime, Storage) |
| UI | Bootstrap 5, Bootstrap Icons |
| Utilities | browser-image-compression |

## Project Structure

```text
.
├── index.html
├── create.html
├── homePage.html
├── src/
│   ├── homePage.js
│   ├── account/
│   ├── config/
│   └── fetchData/
├── css/
├── public/
│   ├── site.webmanifest
│   └── sw.js
├── sw.js
└── vite.config.js
```

## Local Development

### Prerequisites

- Node.js 20+
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the app

```bash
npm run dev
```

Vite opens `index.html` by default. This project uses three entry pages:

- `index.html` (login)
- `create.html` (registration)
- `homePage.html` (main app)

### 4. Build for production

```bash
npm run build
npm run preview
```

## Supabase Setup

Create the tables used by the app:

- `profiles` (user profile data, includes `id`, `email`, `username`, `status`)
- `friends` (friend relationships + request status)
- `messages` (chat messages + file metadata)
- `support` (contact/support messages)
- `account deletion requests` (account deletion requests)

Also configure:

- Auth providers: Email + Google
- Realtime on `profiles`, `friends`, and `messages`
- Storage bucket: `chat_files`
- Row Level Security policies for user-owned data

## Messaging and File Limits

- Images: max 20 MB raw input, compressed client-side before upload
- Video: max 25 MB
- Audio/documents/other files: max 15 MB
- Blocked file extensions: `.exe`, `.bat`, `.cmd`, `.sh`, `.msi`, `.com`, `.scr`, `.vbs`

## PWA Notes

The app registers `/sw.js` and uses a network-first strategy with cache fallback. Cached assets are versioned with `webtalk-v3`, and old caches are removed during service worker activation.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local dev server |
| `npm run build` | Build production assets |
| `npm run preview` | Preview production build locally |

