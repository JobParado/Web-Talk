# WebTalk

WebTalk is a real-time chat application built with vanilla JavaScript, Vite, and Supabase — no frontend framework required. It handles authentication, friend management, live presence, and rich media messaging inside a responsive multi-panel interface.

## Highlights

- Supabase Auth (email/password + Google sign-in)
- Real-time message delivery via Supabase Realtime
- Full friend request workflow — send, accept, decline, cancel, unfriend
- Live presence indicators showing who's online
- Media sharing: images, video, audio, and documents
- Client-side image compression before upload
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

The frontend communicates directly with Supabase from the browser. Authentication controls access to user data, while Row Level Security policies enforce ownership and access rules at the database level.

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

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
# Create a .env file in the project root:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Run the app
npm run dev
```

This project uses three entry pages: `index.html` (login), `create.html` (registration), and `homePage.html` (main app).

## Supabase Setup

WebTalk requires a Supabase project for auth, database, realtime, and storage.

### Database Tables

| Table | Purpose |
| --- | --- |
| `profiles` | User profile info (id, email, username, status) |
| `friends` | Friendship relationships and request status |
| `messages` | Chat messages and file metadata |
| `support` | Contact and support messages |
| `account deletion requests` | Account deletion requests |

### Authentication

Enable **Email/password** and **Google** providers in the Supabase dashboard.

### Realtime

Enable Supabase Realtime for `profiles`, `friends`, and `messages`.

### Storage

Create a storage bucket named `chat_files` for uploaded images, videos, audio, and documents.

### Security

Enable Row Level Security (RLS) on user-owned tables. Do not commit `.env` or any secret credentials to the repository.

## File Limits

| Type | Limit |
| --- | --- |
| Images | 20 MB (compressed client-side before upload) |
| Video | 25 MB |
| Audio / Documents | 15 MB |
| Blocked extensions | `.exe`, `.bat`, `.cmd`, `.sh`, `.msi`, `.com`, `.scr`, `.vbs` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local dev server |
| `npm run build` | Build production assets |
| `npm run preview` | Preview production build locally |

## Acknowledgments

- [Supabase](https://supabase.com) — backend services
- [Vite](https://vitejs.dev) — build tooling
- [Bootstrap](https://getbootstrap.com) — UI components
- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) — client-side compression
