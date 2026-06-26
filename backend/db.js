const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const TRIALS_FILE = path.join(DATA_DIR, 'trials.json');

let cloudbaseApp = null;
let cloudbaseDb = null;
let useCloudBase = false;

function isCloudBaseEnv() {
  return !!(process.env.TCB_ENV || process.env.SCF_NAMESPACE || process.env.KUBERNETES_SERVICE_HOST);
}

async function init() {
  useCloudBase = isCloudBaseEnv();
  if (useCloudBase) {
    const tcb = require('@cloudbase/node-sdk');
    cloudbaseApp = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
    cloudbaseDb = cloudbaseApp.database();
    // 确保集合存在（CloudBase 会自动创建）
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) writeJSON(USERS_FILE, []);
  if (!fs.existsSync(SESSIONS_FILE)) writeJSON(SESSIONS_FILE, []);
  if (!fs.existsSync(TRIALS_FILE)) writeJSON(TRIALS_FILE, []);
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

function nextId(items) {
  return items.length > 0 ? Math.max(...items.map(i => Number(i.id))) + 1 : 1;
}

function normalizeDoc(doc) {
  if (!doc) return null;
  const obj = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };
  if (obj._id) {
    obj.id = obj._id.toString ? obj._id.toString() : obj._id;
  }
  return obj;
}

function normalizeList(docs) {
  return (docs || []).map(normalizeDoc).filter(Boolean);
}

// Users
async function getUsers() {
  if (useCloudBase) {
    const { data } = await cloudbaseDb.collection('users').orderBy('lastSessionAt', 'desc').get();
    const users = normalizeList(data);
    // 计算 totalSessions
    for (const u of users) {
      const { total } = await cloudbaseDb.collection('sessions').where({ userId: u.id }).count();
      u.totalSessions = total || 0;
    }
    return users;
  }

  const users = readJSON(USERS_FILE);
  const sessions = readJSON(SESSIONS_FILE);
  return users.map(u => ({
    ...u,
    totalSessions: sessions.filter(s => s.userId === u.id).length
  })).sort((a, b) => {
    if (a.lastSessionAt && b.lastSessionAt) return b.lastSessionAt.localeCompare(a.lastSessionAt);
    if (a.lastSessionAt) return -1;
    if (b.lastSessionAt) return 1;
    return b.id - a.id;
  });
}

async function findUserByName(name) {
  if (useCloudBase) {
    const { data } = await cloudbaseDb.collection('users').where({ name }).get();
    const list = normalizeList(data);
    return list[0] || null;
  }
  const users = readJSON(USERS_FILE);
  return users.find(u => u.name === name) || null;
}

async function createUser(user) {
  if (useCloudBase) {
    const { id } = await cloudbaseDb.collection('users').add(user);
    return { ...user, id };
  }
  const users = readJSON(USERS_FILE);
  user.id = nextId(users);
  users.push(user);
  writeJSON(USERS_FILE, users);
  return user;
}

async function updateUser(id, updates) {
  if (useCloudBase) {
    await cloudbaseDb.collection('users').doc(id).update(updates);
    return;
  }
  const users = readJSON(USERS_FILE);
  const idx = users.findIndex(u => u.id === Number(id));
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updates };
    writeJSON(USERS_FILE, users);
  }
}

// Sessions
async function getSessions(filters = {}) {
  if (useCloudBase) {
    let query = cloudbaseDb.collection('sessions');
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.gameType) where.gameType = filters.gameType;
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.$gte = filters.dateFrom;
      if (filters.dateTo) where.date.$lte = filters.dateTo;
    }
    if (Object.keys(where).length > 0) query = query.where(where);
    const { data } = await query.orderBy('timestamp', 'desc').get();
    return normalizeList(data);
  }

  let sessions = readJSON(SESSIONS_FILE);
  if (filters.userId) sessions = sessions.filter(s => s.userId === Number(filters.userId));
  if (filters.gameType) sessions = sessions.filter(s => s.gameType === filters.gameType);
  if (filters.dateFrom) sessions = sessions.filter(s => s.date >= filters.dateFrom);
  if (filters.dateTo) sessions = sessions.filter(s => s.date <= filters.dateTo);
  sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return sessions;
}

async function createSession(session, trials) {
  if (useCloudBase) {
    const sessionRes = await cloudbaseDb.collection('sessions').add(session);
    const sessionId = sessionRes.id;
    if (trials && trials.length > 0) {
      const batch = trials.map(t => ({
        ...t,
        sessionId,
        userId: session.userId,
        userName: session.userName,
        gameType: session.gameType
      }));
      // CloudBase add 一次最多 50 条
      for (let i = 0; i < batch.length; i += 50) {
        await cloudbaseDb.collection('trials').add(batch.slice(i, i + 50));
      }
    }
    return { id: sessionId, savedTrials: trials ? trials.length : 0 };
  }

  const sessions = readJSON(SESSIONS_FILE);
  session.id = nextId(sessions);
  sessions.push(session);
  writeJSON(SESSIONS_FILE, sessions);

  const trialsData = readJSON(TRIALS_FILE);
  if (trials && trials.length > 0) {
    for (const t of trials) {
      trialsData.push({
        id: nextId(trialsData),
        sessionId: session.id,
        userId: session.userId,
        userName: session.userName,
        gameType: session.gameType,
        round: t.round || 0,
        rt: t.rt || 0,
        correct: t.correct ? 1 : 0,
        response: t.response || '',
        stimulus: t.stimulus || '',
        condition: t.condition || '',
        extra: t.extra || {},
        timestamp: t.timestamp || session.timestamp || new Date().toISOString()
      });
    }
    writeJSON(TRIALS_FILE, trialsData);
  }
  return { id: session.id, savedTrials: trials ? trials.length : 0 };
}

async function getTrials(sessionId) {
  if (useCloudBase) {
    const { data } = await cloudbaseDb.collection('trials').where({ sessionId }).orderBy('round', 'asc').get();
    return normalizeList(data);
  }
  return readJSON(TRIALS_FILE)
    .filter(t => t.sessionId === Number(sessionId))
    .sort((a, b) => a.round - b.round);
}

async function deleteSession(sessionId) {
  if (useCloudBase) {
    await cloudbaseDb.collection('sessions').doc(sessionId).remove();
    const { data } = await cloudbaseDb.collection('trials').where({ sessionId }).get();
    for (const doc of data || []) {
      await cloudbaseDb.collection('trials').doc(doc._id).remove();
    }
    return;
  }

  let sessions = readJSON(SESSIONS_FILE);
  const session = sessions.find(s => s.id === Number(sessionId));
  sessions = sessions.filter(s => s.id !== Number(sessionId));
  writeJSON(SESSIONS_FILE, sessions);

  let trials = readJSON(TRIALS_FILE);
  trials = trials.filter(t => t.sessionId !== Number(sessionId));
  writeJSON(TRIALS_FILE, trials);

  if (session) {
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === session.userId);
    if (user) {
      user.sessionCount = Math.max(0, (user.sessionCount || 0) - 1);
      writeJSON(USERS_FILE, users);
    }
  }
}

module.exports = {
  init,
  getUsers,
  findUserByName,
  createUser,
  updateUser,
  getSessions,
  createSession,
  getTrials,
  deleteSession
};
