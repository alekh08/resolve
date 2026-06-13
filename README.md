# Resolve — Customer Support Video Platform

A browser-based, self-hosted customer support video platform designed for direct support-agent-to-customer sessions. Built for high reliability during live demonstrations and offline-resilience, Featuring real-time audiovisual streams, desktop screen-sharing, instant textual messaging, secure file transfers, system recording, and comprehensive operational dashboards.

## 🚀 Key Features

1. **Role-Based Workflows**:
   - **Support Agent**: Access controls, logs dashboard, logs audit center, session creation, recording controls, system ending.
   - **Customer**: No log in required! Instant entrance via safe invite link token, real-time audio/video, text chat, download/upload file attachments.

2. **Audiovisual Calling**:
   - WebRTC powered peer-to-peer visual engine using standard browser native `getUserMedia` camera/audio capture and custom Socket.io signaling.

3. **Secure File sharing**:
   - Multipart file upload engine with express-side validation supporting `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.doc`, `.docx`, and `.txt` up to 10MB.

4. **Live Call Recording**:
   - Call recording tracing with "Recording", "Processing", and "Ready" statuses. Recordings are natively compiled by the browser and uploaded to the server seamlessly.

5. **Security & Persistence**:
   - Database operations managed with **Prisma ORM** + local SQLite (for out-of-the-box resilience) or easily swappable to **PostgreSQL**.
   - Session authentication signed with JSON Web Tokens (JWT) and passwords hashed with Bcrypt.

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide icons
- **Backend**: Node.js, Express, TypeScript (TSX compilation)
- **Database**: PostgreSQL (supported) / SQLite (pre-configured) via Prisma ORM
- **Sockets**: Socket.IO for real-time signaling and chat

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-resolve-hackathon-token"
```

To run in standard PostgreSQL, alter `prisma/schema.prisma` datasource provider to `"postgresql"` and provide the postgres database connection URL.

---

## 🏃 Setup & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate local Prisma client and DB file
```bash
npx prisma db push
```

### 3. Run in Development Mode
```bash
npm run dev
```
Vite will start the client portal on **Port 3000** and programmatically boot the Express Socket.io backend on **Port 5000** in a background worker, managing all proxy routing natively.

### 4. Build & Start for Production
```bash
npm run build
npm run start
```
The server will run on standard production **Port 3000**, serving the React statically compiled files from `/dist` and mounting express endpoints simultaneously.

---

## ⚠️ Known Limitations

- **WebRTC Connection on Restricted Networks**: The peer-to-peer video connection might fail on strictly restricted corporate networks or VPNs that completely block standard UDP STUN/TURN traversal.
- **Recording Generation Interruption**: Video recordings of support calls are compiled in the client browser and uploaded upon completion. Navigating away from the browser, refreshing, or closing the tab *before* clicking "Stop Recording" and letting the upload finish will result in the recording getting stuck in the `PROCESSING` state permanently.
- **1-on-1 Design Constraint**: The application architecture is designed strictly for 1-on-1 support sessions (1 Agent to 1 Customer). Joining multiple agents or multiple customers to the exact same room may cause unpredictable WebRTC renegotiation behavior.
- **Ephemeral Storage on PaaS**: By default, the application uses a local SQLite database (`dev.db`) and local file system for uploads. Deploying to ephemeral filesystem environments (like Render or Heroku) without attaching a persistent disk volume will cause chat histories, session data, and video recordings to be wiped on every deployment or server restart.

---

## 🐳 Docker Deployment Setup

A production ready `Dockerfile` file for complete application container packaging is positioned at `/Dockerfile`.

To build and run:
```bash
docker build -t resolve-support-platform .
docker run -p 3000:3000 resolve-support-platform
```
