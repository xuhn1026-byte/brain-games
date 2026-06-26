const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.init();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Login or register
app.post('/api/login', async (req, res) => {
  try {
    await db.init();
    const { name, pin } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: '姓名和 PIN 不能为空' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN 必须是 4 位数字' });
    }

    const normalizedName = String(name).trim();
    let user = await db.findUserByName(normalizedName);

    if (user) {
      if (user.pin !== pin) {
        return res.status(401).json({ error: 'PIN 错误，请重新输入' });
      }
    } else {
      user = await db.createUser({
        name: normalizedName,
        pin,
        createdAt: new Date().toISOString(),
        lastSessionAt: null,
        sessionCount: 0
      });
    }

    res.json({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
      lastSessionAt: user.lastSessionAt,
      sessionCount: user.sessionCount
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || '登录失败' });
  }
});

// List users
app.get('/api/users', async (req, res) => {
  try {
    await db.init();
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: err.message || '获取用户失败' });
  }
});

// Save a session
app.post('/api/sessions', async (req, res) => {
  try {
    await db.init();
    const {
      userId, userName, gameType, gameName, timestamp,
      totalRounds, completedRounds, score, avgAccuracy, avgRT,
      summary, trials
    } = req.body;

    if (!userId || !gameType || !gameName) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const users = await db.getUsers();
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const date = timestamp ? timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const session = {
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

    const result = await db.createSession(session, trials || []);

    await db.updateUser(user.id, {
      sessionCount: (user.sessionCount || 0) + 1,
      lastSessionAt: new Date().toISOString()
    });

    res.json(result);
  } catch (err) {
    console.error('Save session error:', err);
    res.status(500).json({ error: err.message || '保存失败' });
  }
});

// Query sessions
app.get('/api/sessions', async (req, res) => {
  try {
    await db.init();
    const { userId, gameType, dateFrom, dateTo } = req.query;
    const sessions = await db.getSessions({ userId, gameType, dateFrom, dateTo });
    res.json(sessions);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: err.message || '获取记录失败' });
  }
});

// Get trials for a session
app.get('/api/sessions/:id/trials', async (req, res) => {
  try {
    await db.init();
    const trials = await db.getTrials(req.params.id);
    res.json(trials);
  } catch (err) {
    console.error('Get trials error:', err);
    res.status(500).json({ error: err.message || '获取明细失败' });
  }
});

// Delete a session
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await db.init();
    await db.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: err.message || '删除失败' });
  }
});

// 本地开发时启动服务器
if (require.main === module) {
  db.init().then(() => {
    app.listen(PORT, () => {
      console.log(`Brain-games backend running at http://127.0.0.1:${PORT}`);
    });
  });
}

module.exports = app;
