# WebTalk 💬

A real-time web chat application built with vanilla JavaScript, Supabase, and Bootstrap. WebTalk lets users sign up, add friends, and exchange text messages and media files — all in a clean, dark-themed UI that works on desktop and mobile as a PWA.

## Features

- **Email & Google authentication** via Supabase Auth
- **Real-time messaging** with text, images, video, audio, and file attachments
- **Friend system** — send, accept, decline, and cancel friend requests; unfriend at any time
- **Live presence** — see when a friend is online or offline
- **Username management** — change your display name from the Settings tab
- **Image compression** — client-side compression before upload keeps storage usage low
- **Progressive Web App (PWA)** — installable on mobile with safe-area inset support
- **Responsive layout** — three-column desktop view collapses to a mobile-friendly single-panel view

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JS (ES Modules) |
| UI Framework | Bootstrap 5 + Bootstrap Icons |
| Backend / Database | [Supabase](https://supabase.com) (Postgres, Auth, Storage, Realtime) |
| Build Tool | Vite |
| Image Compression | `browser-image-compression` |

## Project Structure

```
├── index.html              # Login page
├── create.html             # Registration page
├── homePage.html           # Main app shell
├── css/
│   ├── LoginCreate.css     # Styles for auth pages
│   ├── homepage.css        # Layout and responsive styles
│   ├── homepage2.css       # Component-level dark-theme styles
│   └── skeleton.css        # Shimmer loading skeleton
└── src/
    ├── homePage.js         # Core app logic (messaging, friends, presence)
    ├── config/
    │   └── supabaseClient.js
    ├── account/
    │   ├── loginEmail.js
    │   ├── loginGoogle.js
    │   ├── registerEmail.js
    │   └── account.js      # Username update, support, account deletion
    └── fetchData/
        ├── fetchUsers.js
        └── friendLists.js  # DOM rendering for friend/chat lists
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the following tables: `profiles`, `friends`, `messages`, `support`, `account deletion requests`
- A Supabase storage bucket named `chat_files` (public read, authenticated write)

### Setup

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd webtalk
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file at the project root:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

### Supabase Setup

Enable the following in your Supabase project:

- **Auth providers**: Email (with email confirmation) and Google OAuth
- **Realtime**: enabled on `profiles`, `friends`, and `messages` tables
- **Row Level Security (RLS)**: users should only be able to read/write their own rows

> [!NOTE]
> The app derives a default username from the user's email address on first login and creates a `profiles` row automatically.

## File Uploads

Supported attachment types:

- **Images** — compressed client-side before upload (max 20 MB raw)
- **Video** — max 25 MB
**Audio** — streamed via `<audio>` element
- **Documents** — PDF, Word, Excel, PowerPoint, CSV, TXT, and more (max 15 MB)

Executable files (`.exe`, `.bat`, `.sh`, etc.) are blocked on the client side.

## PWA Support

WebTalk registers a service worker (`sw.js`) and includes a web manifest (`site.webmanifest`), making it installable on Android and iOS home screens. The layout uses `env(safe-area-inset-bottom)` to avoid content being obscured by device notches or home indicators.
