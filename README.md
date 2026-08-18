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


## Architecture

WebTalk uses a client-driven architecture built around Supabase services:

```text
Browser
   │
   ├── Vanilla JavaScript + Vite
   │
   └── Supabase
        ├── Auth       → user authentication
        ├── Postgres   → profiles, friends, messages, support
        ├── Realtime   → live messages, presence, friend updates
        └── Storage    → chat media and documents
```

The frontend communicates directly with Supabase from the browser using the Supabase JavaScript client. Authentication controls access to user data, while Row Level Security policies enforce ownership and access rules at the database level.

Media files are uploaded to Supabase Storage, while message records store the associated file metadata and storage path.


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

WebTalk requires a Supabase project for authentication, database access, realtime updates, and file storage.

### Database tables

Create the following tables:

* `profiles` — user profile information such as `id`, `email`, `username`, and `status`
* `friends` — friendship relationships and friend request status
* `messages` — chat messages and file metadata
* `support` — contact and support messages
* `account deletion requests` — requests to delete user accounts

### Authentication

Enable these authentication providers in the Supabase dashboard:

* Email/password
* Google

### Realtime

Enable Supabase Realtime for:

* `profiles`
* `friends`
* `messages`

This allows the application to receive live updates without repeatedly polling the database.

### Storage

Create a storage bucket named:

```text
chat_files
```

The application uses this bucket for uploaded images, videos, audio, and documents.

### Security

Enable Row Level Security (RLS) on user-owned tables and create policies that restrict users to data they are authorized to access.

Do not commit the `.env` file or any secret credentials to the repository.


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

## Acknowledgments

- [Supabase](https://supabase.com) — authentication, database, realtime, and storage backend
- [Vite](https://vitejs.dev) — build tooling and dev server
- [Bootstrap](https://getbootstrap.com) — UI components and icons
- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) — client-side image compression before upload
