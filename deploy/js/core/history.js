/**
 * 脑力训练历史记录管理器
 * 支持：添加记录、查询历史、按游戏筛选、计算趋势、最佳记录
 */

const HISTORY_KEY = 'brainGameHistory';
const MAX_RECORDS = 50; // 每款游戏最多保留50条记录

/**
 * 添加一条测试结果到历史记录
 * @param {Object} result - 单次测试结果（gameType, gameName, score, accuracy, avgRT, summary, ...）
 */
function addHistoryRecord(result) {
  const history = getAllHistory();
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    gameType: result.gameType,
    gameName: result.gameName,
    timestamp: result.timestamp || new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    score: result.score || 0,
    accuracy: result.summary?.avgAccuracy || 0,
    avgRT: result.summary?.avgRT || result.summary?.avgRecallTime || 0,
    summary: result.summary,
    logsCount: result.logs?.length || 0
  };

  history.unshift(record); // 新记录放前面

  // 按游戏类型截断，保留最近 MAX_RECORDS 条
  const trimmed = [];
  const gameTypeCount = {};
  for (const r of history) {
    gameTypeCount[r.gameType] = (gameTypeCount[r.gameType] || 0) + 1;
    if (gameTypeCount[r.gameType] <= MAX_RECORDS) {
      trimmed.push(r);
    }
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  return record;
}

/**
 * 获取所有历史记录
 */
function getAllHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * 按游戏类型筛选历史记录
 * @param {string} gameType - 如 'memory_matrix'
 * @param {number} limit - 最近几条
 */
function getHistoryByGame(gameType, limit = 20) {
  return getAllHistory()
    .filter(r => r.gameType === gameType)
    .slice(0, limit);
}

/**
 * 获取最近一次某游戏的记录（用于对比）
 */
function getLastRecord(gameType) {
  const records = getHistoryByGame(gameType, 2);
  return records.length >= 2 ? records[1] : null;
}

/**
 * 获取最佳记录
 */
function getBestRecord(gameType, metric = 'score') {
  const records = getHistoryByGame(gameType);
  if (!records.length) return null;
  return records.reduce((best, r) => (r[metric] > best[metric] ? r : best), records[0]);
}

/**
 * 计算趋势数据（最近 N 次）
 * @param {string} gameType
 * @param {string} metric - 'score' | 'accuracy' | 'avgRT'
 * @param {number} limit
 */
function getTrendData(gameType, metric = 'score', limit = 10) {
  const records = getHistoryByGame(gameType, limit).reverse();
  return records.map((r, i) => ({
    round: i + 1,
    date: r.date,
    value: r[metric] || 0
  }));
}

/**
 * 计算连续训练天数
 */
function getStreakDays() {
  const history = getAllHistory();
  const dates = [...new Set(history.map(r => r.date))].sort().reverse();
  if (!dates.length) return 0;

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let checkDate = dates[0] === today ? today : yesterday;
  for (const date of dates) {
    if (date === checkDate) {
      streak++;
      checkDate = new Date(new Date(checkDate).getTime() - 86400000).toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * 获取总训练统计
 */
function getOverallStats() {
  const history = getAllHistory();
  const gameTypes = [...new Set(history.map(r => r.gameType))];

  const byGame = {};
  gameTypes.forEach(type => {
    const records = history.filter(r => r.gameType === type);
    byGame[type] = {
      count: records.length,
      bestScore: Math.max(...records.map(r => r.score)),
      avgAccuracy: Math.round(records.reduce((s, r) => s + r.accuracy, 0) / records.length),
      lastPlayed: records[0]?.date
    };
  });

  return {
    totalSessions: history.length,
    totalGames: gameTypes.length,
    streakDays: getStreakDays(),
    byGame
  };
}

/**
 * 导出所有数据为 JSON
 */
function exportAllData() {
  const data = {
    exportTime: new Date().toISOString(),
    history: getAllHistory(),
    currentResult: JSON.parse(localStorage.getItem('brainGameResults') || '{}')
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 导入历史数据
 */
function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.history && Array.isArray(data.history)) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * 清空历史记录
 */
function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// 暴露到全局
window.BrainHistory = {
  add: addHistoryRecord,
  getAll: getAllHistory,
  getByGame: getHistoryByGame,
  getLast: getLastRecord,
  getBest: getBestRecord,
  getTrend: getTrendData,
  getStreak: getStreakDays,
  getStats: getOverallStats,
  export: exportAllData,
  import: importAllData,
  clear: clearHistory
};
