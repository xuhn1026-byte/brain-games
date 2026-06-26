/**
 * 脑力训练历史记录管理器
 * 支持：添加记录、查询历史、按游戏筛选、计算趋势、最佳记录
 */

const HISTORY_KEY = 'brainGameHistory';
const MAX_RECORDS = 50; // 每款游戏最多保留50条记录

/**
 * 将游戏日志转换为后端统一的 trials 格式
 */
function convertLogsToTrials(result) {
  const gameType = result.gameType;
  const logs = result.logs || [];

  return logs.map((log, idx) => {
    const round = log.round || idx + 1;
    let rt = log.rt || 0;
    let correct = log.correct ? 1 : 0;
    let response = log.response || '';
    let stimulus = log.stimulus || '';
    let condition = log.condition || '';
    let extra = {};

    if (gameType === 'memory_matrix') {
      const firstClick = (log.clicks || [])[0];
      rt = firstClick ? firstClick.rt : (log.totalRecallTime || 0);
      correct = (log.accuracy || 0) >= 0.7 ? 1 : 0;
      response = `点击${(log.clicks || []).length}次`;
      stimulus = `${log.gridSize || 3}×${log.gridSize || 3}网格, ${log.targetCount || 0}个目标`;
      condition = log.difficulty || 'medium';
      extra = {
        hits: log.hits || 0,
        misses: log.misses || 0,
        falseAlarms: log.falseAlarms || 0,
        targetCount: log.targetCount || 0,
        gridSize: log.gridSize || 3,
        totalRecallTime: log.totalRecallTime || 0
      };
    } else if (gameType === 'flanker_bird') {
      rt = log.rt || 0;
      correct = log.correct ? 1 : 0;
      response = log.response || '';
      stimulus = `${(log.flankerCount || 0) * 2 + 1}箭头`;
      condition = log.isNeutral ? 'neutral' : (log.isCongruent ? 'congruent' : 'incongruent');
      extra = {
        targetDirection: log.targetDirection || '',
        flankerCount: log.flankerCount || 0
      };
    } else if (gameType === 'speed_match') {
      rt = log.rt || 0;
      correct = log.correct ? 1 : 0;
      response = log.response || '';
      stimulus = log.symbol || '';
      condition = log.isSame ? 'same' : 'different';
      extra = { symbolSet: log.symbolSet || 'shapes' };
    } else if (gameType === 'memory_match') {
      rt = log.rt || 0;
      correct = log.correct ? 1 : 0;
      response = log.response || '';
      stimulus = log.targetSymbol || '';
      condition = log.isMatch ? 'match' : 'noMatch';
      extra = {
        sequenceLength: log.sequenceLength || 0,
        nBack: log.nBack || 0
      };
    } else if (gameType === 'color_shape') {
      rt = log.rt || 0;
      correct = log.correct ? 1 : 0;
      response = log.response || '';
      stimulus = `${log.targetColor || ''}${log.targetShape || ''}`;
      condition = `${log.rule || ''},${log.isSwitch ? 'switch' : 'repeat'}`;
      extra = {
        rule: log.rule || '',
        isSwitch: !!log.isSwitch
      };
    } else {
      // 通用 fallback
      extra = { raw: log };
    }

    return {
      round,
      rt,
      correct,
      response,
      stimulus,
      condition,
      extra,
      timestamp: log.timestamp || result.timestamp || new Date().toISOString()
    };
  });
}

/**
 * 同步一次训练结果到后端
 */
async function syncToBackend(result) {
  if (!window.BrainAuth || !window.BrainAPI) return;
  const user = window.BrainAuth.getUser();
  if (!user) return;

  const summary = result.summary || {};
  const payload = {
    userId: user.id,
    userName: user.name,
    gameType: result.gameType,
    gameName: result.gameName,
    timestamp: result.timestamp || new Date().toISOString(),
    totalRounds: result.totalRounds || 0,
    completedRounds: result.completedRounds || 0,
    score: result.score || 0,
    avgAccuracy: summary.avgAccuracy || 0,
    avgRT: summary.avgRT || summary.avgRecallTime || 0,
    summary: summary,
    trials: convertLogsToTrials(result)
  };

  try {
    await window.BrainAPI.saveSession(payload);
  } catch (err) {
    console.error('同步到后端失败:', err);
  }
}

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

  // 异步同步到后端（不阻塞本地保存）
  syncToBackend(result);

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
  clear: clearHistory,
  syncToBackend: syncToBackend
};
