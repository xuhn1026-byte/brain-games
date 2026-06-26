const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const TRIALS_FILE = path.join(DATA_DIR, 'trials.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(items) {
  return items.length > 0 ? Math.max(...items.map(i => Number(i.id))) + 1 : 1;
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Login or register
app.post('/api/login', (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: '姓名和 PIN 不能为空' });
  }
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN 必须是 4 位数字' });
  }

  const normalizedName = String(name).trim();
  const users = readJSON(USERS_FILE);
  let user = users.find(u => u.name === normalizedName);

  if (user) {
    if (user.pin !== pin) {
      return res.status(401).json({ error: 'PIN 错误，请重新输入' });
    }
  } else {
    user = {
      id: nextId(users),
      name: normalizedName,
      pin,
      createdAt: new Date().toISOString(),
      lastSessionAt: null,
      sessionCount: 0
    };
    users.push(user);
    writeJSON(USERS_FILE, users);
  }

  res.json({
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
    lastSessionAt: user.lastSessionAt,
    sessionCount: user.sessionCount
  });
});

// List users
app.get('/api/users', (req, res) => {
  const users = readJSON(USERS_FILE);
  const sessions = readJSON(SESSIONS_FILE);
  const result = users.map(u => ({
    ...u,
    totalSessions: sessions.filter(s => s.userId === u.id).length
  })).sort((a, b) => {
    if (a.lastSessionAt && b.lastSessionAt) return b.lastSessionAt.localeCompare(a.lastSessionAt);
    if (a.lastSessionAt) return -1;
    if (b.lastSessionAt) return 1;
    return b.id - a.id;
  });
  res.json(result);
});

// Save a session
app.post('/api/sessions', (req, res) => {
  const {
    userId, userName, gameType, gameName, timestamp,
    totalRounds, completedRounds, score, avgAccuracy, avgRT,
    summary, trials
  } = req.body;

  if (!userId || !gameType || !gameName) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const sessions = readJSON(SESSIONS_FILE);
  const trialsData = readJSON(TRIALS_FILE);

  const date = timestamp ? timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const session = {
    id: nextId(sessions),
    userId: user.id,
    userName: user.name,
    gameType,
    gameName,
    timestamp: timestamp || new Date().toISOString(),
    date,
    totalRounds: totalRounds || 0,
    completedRounds: completedRounds || 0,
    score: score || 0,
    avgAccuracy: avgAccuracy || 0,
    avgRT: avgRT || 0,
    summary: summary || {},
    createdAt: new Date().toISOString()
  };
  sessions.push(session);
  writeJSON(SESSIONS_FILE, sessions);

  let savedTrials = 0;
  if (Array.isArray(trials) && trials.length > 0) {
    for (const t of trials) {
      trialsData.push({
        id: nextId(trialsData),
        sessionId: session.id,
        userId: user.id,
        userName: user.name,
        gameType,
        round: t.round || 0,
        rt: t.rt || 0,
        correct: t.correct ? 1 : 0,
        response: t.response || '',
        stimulus: t.stimulus || '',
        condition: t.condition || '',
        extra: t.extra || {},
        timestamp: t.timestamp || timestamp || new Date().toISOString()
      });
      savedTrials++;
    }
    writeJSON(TRIALS_FILE, trialsData);
  }

  user.sessionCount = (user.sessionCount || 0) + 1;
  user.lastSessionAt = new Date().toISOString();
  writeJSON(USERS_FILE, users);

  res.json({ id: session.id, savedTrials });
});

// Query sessions
app.get('/api/sessions', (req, res) => {
  const { userId, gameType, dateFrom, dateTo } = req.query;
  let sessions = readJSON(SESSIONS_FILE);

  if (userId) {
    sessions = sessions.filter(s => s.userId === Number(userId));
  }
  if (gameType) {
    sessions = sessions.filter(s => s.gameType === gameType);
  }
  if (dateFrom) {
    sessions = sessions.filter(s => s.date >= dateFrom);
  }
  if (dateTo) {
    sessions = sessions.filter(s => s.date <= dateTo);
  }

  sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json(sessions);
});

// Get trials for a session
app.get('/api/sessions/:id/trials', (req, res) => {
  const trials = readJSON(TRIALS_FILE)
    .filter(t => t.sessionId === Number(req.params.id))
    .sort((a, b) => a.round - b.round);
  res.json(trials);
});

// Delete a session
app.delete('/api/sessions/:id', (req, res) => {
  const sessionId = Number(req.params.id);
  let sessions = readJSON(SESSIONS_FILE);
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }

  sessions = sessions.filter(s => s.id !== sessionId);
  writeJSON(SESSIONS_FILE, sessions);

  let trials = readJSON(TRIALS_FILE);
  trials = trials.filter(t => t.sessionId !== sessionId);
  writeJSON(TRIALS_FILE, trials);

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === session.userId);
  if (user) {
    user.sessionCount = Math.max(0, (user.sessionCount || 0) - 1);
    writeJSON(USERS_FILE, users);
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Brain-games backend running at http://127.0.0.1:${PORT}`);
});
