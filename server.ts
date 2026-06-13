import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'resolve-hackathon-token-secret';

// Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
// Serve uploads statically
app.use('/uploads', express.static(uploadsDir));

// Also serve production frontend build if in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
}

// Ensure database self-seeding for Agent
async function seedDefaultAgent() {
  try {
    const existingAgent = await prisma.user.findUnique({
      where: { email: 'agent@resolve.com' },
    });
    if (!existingAgent) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'agent@resolve.com',
          password: hashedPassword,
          role: 'AGENT',
        },
      });
      console.log('✅ Default support agent registered: agent@resolve.com / password123');
    }
  } catch (error) {
    console.error('Error seeding default agent:', error);
  }
}
seedDefaultAgent();

// File upload configuration using Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // Increase limit to 25MB for better support files
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx',
      '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.zip', '.rar',
      '.7z', '.txt', '.mp3', '.wav', '.mp4', '.mov', '.webm'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Allowed formats for secure transmission: ${allowedExtensions.join(', ')}`));
    }
  },
});

// Middleware for JWT authorization
const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Access token is invalid or expired' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is required' });
  }
};

// --- AUTHENTICATION APIS ---
app.post('/api/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateJWT, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SESSION APIS ---
app.post('/api/sessions', authenticateJWT, async (req: any, res: any) => {
  const { title } = req.body;
  const inviteToken = 'req-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  try {
    const session = await prisma.session.create({
      data: {
        title: title || 'Support Session',
        token: inviteToken,
        status: 'PENDING',
        agentId: req.user.userId,
      },
    });

    await prisma.eventLog.create({
      data: {
        sessionId: session.id,
        type: 'SESSION_CREATED',
        detail: `Session "${session.title}" created by agent ${req.user.email}`,
      },
    });

    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve lists of sessions
app.get('/api/sessions', authenticateJWT, async (req: any, res: any) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { email: true } },
        participants: true,
        recordings: true,
      },
    });
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Active dashboard list (Pending/Active statuses)
app.get('/api/sessions/active', authenticateJWT, async (req: any, res: any) => {
  try {
    const activeSessions = await prisma.session.findMany({
      where: {
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { email: true } },
        participants: true,
      },
    });
    res.json(activeSessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed session
app.get('/api/sessions/:id', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        agent: { select: { email: true } },
        participants: true,
        messages: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
        recordings: true,
        eventLogs: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join session by secure token info
app.get('/api/join/:token', async (req: any, res: any) => {
  const { token } = req.params;
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        agent: { select: { email: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Invalid or expired invite link token' });
    }

    if (session.status === 'COMPLETED') {
      return res.status(400).json({ error: 'This support session has already ended.' });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Force end session API
app.post('/api/sessions/:id/end', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    await prisma.eventLog.create({
      data: {
        sessionId: id,
        type: 'SESSION_ENDED',
        detail: `Session closed cleanly.`,
      },
    });

    // Notify all participants in Socket.io room to disconnect
    io.to(id).emit('session-ended', { sessionId: id });

    res.json(updatedSession);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Messages history
app.get('/api/sessions/:id/messages', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Attachment upload
app.post('/api/sessions/:id/upload', (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: any, res: any) => {
  const { id } = req.params;
  const { senderName, senderRole } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided or file format is unacceptable' });
  }

  try {
    const attachment = await prisma.attachment.create({
      data: {
        sessionId: id,
        senderName: senderName || 'User',
        senderRole: senderRole || 'CUSTOMER',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        fileUrl: `/uploads/${req.file.filename}`,
      },
    });

    // Create system message to broadcast inside Chat
    const systemText = `Shared file: ${attachment.fileName}`;
    const sysMsg = await prisma.message.create({
      data: {
        sessionId: id,
        senderId: 'SYSTEM',
        senderName: 'System',
        senderRole: 'SYSTEM',
        text: JSON.stringify({
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          fileSize: attachment.fileSize,
          senderName: attachment.senderName,
          senderRole: attachment.senderRole,
        }),
      },
    });

    io.to(id).emit('message-received', sysMsg);

    res.status(201).json(attachment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- LIVKIT TOKEN GENERATOR ---
app.post('/api/sessions/:id/token', async (req: any, res: any) => {
  const { id } = req.params;
  const { name, role } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  // Let's create proper LiveKit token if variables exist, else we generate safe mock token/status.
  if (apiKey && apiSecret && livekitUrl) {
    try {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: `${role}-${name}-${Date.now()}`,
        name: name,
      });
      at.addGrant({ roomJoin: true, room: id, canPublish: true, canSubscribe: true });
      const tokenStr = await at.toJwt();
      return res.json({ token: tokenStr, url: livekitUrl, simulated: false });
    } catch (err: any) {
      console.error('Failed generating real LiveKit token:', err);
    }
  }

  // If no configured LiveKit credentials, we return a mock token status gracefully.
  // The app will run our WebRTC mock simulation room seamlessly so it's fully demoable.
  return res.json({
    token: `simulated-token-${role}-${id}`,
    url: 'ws://mock-livekit-session',
    simulated: true,
  });
});

// --- RECORDING APIS ---

const recordingsDir = path.join(uploadsDir, 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Multer storage for browser-native video/audio uploads
const recordingsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'rec-' + uniqueSuffix + (path.extname(file.originalname) || '.webm'));
  },
});

const uploadRecording = multer({
  storage: recordingsStorage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit
});

const serializeRecording = (rec: any) => {
  if (!rec) return null;
  return {
    id: rec.id,
    sessionId: rec.sessionId,
    session_id: rec.sessionId,
    status: rec.status,
    startedAt: rec.startedAt,
    created_at: rec.startedAt,
    endedAt: rec.endedAt,
    durationSec: rec.durationSec,
    duration: rec.durationSec,
    fileName: rec.fileName,
    filename: rec.fileName,
    fileSize: rec.fileSize,
    file_size: rec.fileSize,
    downloadUrl: rec.downloadUrl,
    download_url: rec.downloadUrl,
    uploadedBy: rec.uploadedBy,
    uploaded_by: rec.uploadedBy,
    session: rec.session,
  };
};

app.post('/api/sessions/:id/record/start', async (req: any, res: any) => {
  const { id } = req.params;
  let uploadedBy = 'agent@resolve.com';
  
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.email) {
        uploadedBy = decoded.email;
      }
    } catch (e) {
      // Optional JWT decoding
    }
  }

  try {
    // End any current active recordings in this session
    await prisma.recording.updateMany({
      where: { sessionId: id, status: 'Recording' },
      data: { status: 'Ready', endedAt: new Date() },
    });

    const recording = await prisma.recording.create({
      data: {
        sessionId: id,
        status: 'Recording',
        startedAt: new Date(),
        uploadedBy,
      },
    });

    await prisma.eventLog.create({
      data: {
        sessionId: id,
        type: 'RECORDING_STARTED',
        detail: `Session browser-native call recording initiated by ${uploadedBy}.`,
      },
    });

    io.to(id).emit('recording-update', { status: 'Recording', recordingId: recording.id });

    res.json(serializeRecording(recording));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions/:id/record/stop', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const activeRecs = await prisma.recording.findMany({
      where: { sessionId: id, status: 'Recording' },
    });

    if (activeRecs.length === 0) {
      return res.status(404).json({ error: 'No active recording found' });
    }

    const endedAt = new Date();
    const updatedRecordings = [];

    for (const rec of activeRecs) {
      const diffSec = Math.round((endedAt.getTime() - rec.startedAt.getTime()) / 1000);
      const updated = await prisma.recording.update({
        where: { id: rec.id },
        data: {
          status: 'Processing',
          endedAt,
          durationSec: diffSec,
        },
      });
      updatedRecordings.push(updated);
    }

    await prisma.eventLog.create({
      data: {
        sessionId: id,
        type: 'RECORDING_STOPPED',
        detail: 'Session call recording stopped. Preparing media streams for upload.',
      },
    });

    io.to(id).emit('recording-update', { status: 'Processing' });

    res.json(serializeRecording(updatedRecordings[0] || null));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload the recorded media blob from the agent browser directly
app.post('/api/sessions/:id/record/upload', uploadRecording.single('video'), async (req: any, res: any) => {
  const { id } = req.params;
  const { durationSec } = req.body;
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No video recording file provided.' });
    }

    // Locate the active Processing or Recording log
    let recording = await prisma.recording.findFirst({
      where: { sessionId: id, status: { in: ['Processing', 'Recording'] } },
      orderBy: { startedAt: 'desc' },
    });

    const isDirect = !recording;
    const endedAt = new Date();
    const fileName = file.filename;
    const fileSize = file.size;
    const downloadUrl = `/uploads/recordings/${fileName}`;
    const finalDuration = durationSec ? parseInt(durationSec, 10) : (recording ? Math.round((endedAt.getTime() - recording.startedAt.getTime()) / 1000) : 10);

    if (isDirect) {
      recording = await prisma.recording.create({
        data: {
          sessionId: id,
          status: 'Ready',
          startedAt: new Date(Date.now() - finalDuration * 1000),
          endedAt,
          durationSec: finalDuration,
          fileName,
          fileSize,
          downloadUrl,
          uploadedBy: 'agent@resolve.com',
        },
      });
    } else {
      recording = await prisma.recording.update({
        where: { id: recording!.id },
        data: {
          status: 'Ready',
          endedAt,
          durationSec: finalDuration,
          fileName,
          fileSize,
          downloadUrl,
        },
      });
    }

    await prisma.eventLog.create({
      data: {
        sessionId: id,
        type: 'RECORDING_UPLOADED',
        detail: `Browser recorded file received. Saved payload: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB). Status set to Ready.`,
      },
    });

    io.to(id).emit('recording-update', { status: 'Ready', downloadUrl });

    res.json(serializeRecording(recording));
  } catch (error: any) {
    console.error('Error uploading browser recording:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/recordings', async (req: any, res: any) => {
  try {
    const recordings = await prisma.recording.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        session: {
          select: {
            title: true,
            createdAt: true,
            agent: { select: { email: true } },
          },
        },
      },
    });
    res.json(recordings.map((r) => serializeRecording(r)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Event Logs for dashboard
app.get('/api/admin/logs', async (req: any, res: any) => {
  try {
    const logs = await prisma.eventLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        session: { select: { title: true } },
      },
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Catch all fallback for routing in SPA
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

// --- SOCKET.IO REALTIME EVENT HANDLERS ---
io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let participantDetails: { name: string; role: string; id: string } | null = null;

  socket.on('join-room', async ({ sessionId, name, role, userId }) => {
    currentRoomId = sessionId;
    socket.join(sessionId);

    const partId = userId || `part-${Math.random().toString(36).substring(2, 9)}`;
    participantDetails = { name, role, id: partId };

    console.log(`📡 [Socket] ${role} (${name}) joined room: ${sessionId}`);

    try {
      // Create participant log & database record
      await prisma.participant.create({
        data: {
          sessionId,
          role,
          name,
          joinedAt: new Date(),
        },
      });

      await prisma.eventLog.create({
        data: {
          sessionId,
          type: 'PARTICIPANT_JOINED',
          detail: `Participant ${name} (${role}) joined the session.`,
        },
      });

      // Update session status to ACTIVE when customer joins
      if (role === 'CUSTOMER') {
        const checkSess = await prisma.session.findUnique({ where: { id: sessionId } });
        if (checkSess && checkSess.status === 'PENDING') {
          await prisma.session.update({
            where: { id: sessionId },
            data: { status: 'ACTIVE', startedAt: new Date(), customerName: name },
          });
        }
      }

      // Tell other users in the room
      io.to(sessionId).emit('participant-joined', {
        id: partId,
        name,
        role,
        timestamp: new Date(),
      });
    } catch (e) {
      console.error('Participant creation log failed:', e);
    }
  });

  socket.on('send-message', async ({ sessionId, text, senderId, senderName, senderRole }) => {
    if (!sessionId || !text) return;

    try {
      const msg = await prisma.message.create({
        data: {
          sessionId,
          senderId: senderId || 'unknown',
          senderName,
          senderRole,
          text,
        },
      });

      // Broadcast back to room
      io.to(sessionId).emit('message-received', msg);
    } catch (e) {
      console.error('Prisma message persistence failed:', e);
    }
  });

  socket.on('screen-share-status', ({ sessionId, sharing, userName, role }) => {
    if (!sessionId) return;
    io.to(sessionId).emit('screen-share-updated', { sharing, userName, role });
  });

  socket.on('disconnect', async () => {
    if (currentRoomId && participantDetails) {
      const { name, role } = participantDetails;
      console.log(`📡 [Socket] ${role} (${name}) left room: ${currentRoomId}`);

      try {
        await prisma.eventLog.create({
          data: {
            sessionId: currentRoomId,
            type: 'PARTICIPANT_LEFT',
            detail: `Participant ${name} (${role}) disconnected.`,
          },
        });

        // Broadcast participant left
        io.to(currentRoomId).emit('participant-left', {
          name,
          role,
          timestamp: new Date(),
        });
      } catch (e) {
        console.error('Log participant left error:', e);
      }
    }
  });
});

// Run server binding
httpServer.listen(PORT, () => {
  console.log(`🚀 Resolve Server running on port ${PORT}`);
});
