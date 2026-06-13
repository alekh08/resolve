# Resolve — Customer Support Video Platform

A browser-based, self-hosted customer support video platform designed for direct support-agent-to-customer sessions. Built for high reliability during live demonstrations and offline-resilience, Featuring real-time audiovisual streams, desktop screen-sharing, instant textual messaging, secure file transfers, system recording, and comprehensive operational dashboards.

## 🚀 Key Features

1. **Role-Based Workflows**:
   - **Support Agent**: Access controls, logs dashboard, logs audit center, session creation, recording controls, system ending.
   - **Customer**: No log in required! Instant entrance via safe invite link token, real-time audio/video, text chat, download/upload file attachments.

2. **Audiovisual Calling**:
   - Powered by **LiveKit OSS** tokens with automatic, feature-rich peer fallback visual engines using standard browser native `getUserMedia` camera/audio capture.

3. **Secure File sharing**:
   - Multipart file upload engine with express-side validation supporting `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.doc`, `.docx`, and `.txt` up to 10MB.

4. **Live Call Recording**:
   - Event log recording tracing with "Recording", "Processing", and "Ready" statuses and automated metadata processing.

5. **Security & Persistence**:
   - Database operations managed with **Prisma ORM** + local SQLite (for out-of-the-box resilience) or easily swappable to **PostgreSQL**.
   - Session authentication signed with JSON Web Tokens (JWT) and passwords hashed with Bcrypt.

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide icons
- **Backend**: Node.js, Express, TypeScript (TSX compilation)
- **Database**: PostgreSQL (supported) / SQLite (pre-configured) via Prisma ORM
- **Sockets**: Socket.IO for real-time room streaming and chat
- **Media**: LiveKit OSS SDK Tokenizers

---

## 📁 Repository Layout

```
├── .env.example            # Environmental variable template
├── .env                    # Active local environment configurations
├── prisma/
│   └── schema.prisma       # Prisma DB model schema
├── src/
│   ├── main.tsx            # React application entrypoint
│   ├── App.tsx             # Interactive Unified Frontend SPA Panels
│   └── index.css           # Tailwind configurations
├── server.ts               # Express API and Socket.IO Full-stack Entrypoint
├── vite.config.ts          # Vite Development server configurations
├── tsconfig.json           # Typography and typescript configs
└── package.json            # Script triggers and runtime dependencies
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory (handled programmatically by AI Studio):
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-resolve-hackathon-token"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
LIVEKIT_URL="ws://localhost:7800"
```

To run in standard PostgreSQL, alter `prisma/schema.prisma` datasource provider to `"postgresql"` and provide the postgres database connection URL.

---

## 🏃 Setup & Execution

### 1. Generate local Prisma client and DB file:
```bash
npx prisma db push
```

### 2. Run in development mode:
```bash
npm run dev
```

Vite will start the client portal on **Port 3000** and programmatically boot the Express Socket.io backend on **Port 5000** in a background worker, managing all proxy routing natively.

### 3. Build & start for production:
```bash
npm run build
npm run start
```
The server will run on standard production **Port 3000**, serving the React statically compiled files from `/dist` and mounting express endpoints simultaneously.

---

## 🐳 Docker Deployment Setup

A production ready `Dockerfile` file for complete application container packaging is positioned at `/Dockerfile`.

To build and run:
```bash
docker build -t resolve-support-platform .
docker run -p 3000:3000 resolve-support-platform
```
