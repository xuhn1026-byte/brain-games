/* ===== 基础游戏引擎 ===== */
class GameEngine {
  constructor(canvasId, config) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.config = config;
    this.state = 'idle'; // idle / countdown / show / recall / feedback / ended
    this.round = 0;
    this.maxRounds = config.totalRounds || 10;
    this.difficulty = config.difficulty || 'medium';
    this.logs = [];
    this.sessionStart = performance.now();
    this.currentRoundData = null;
    
    // 自适应参数
    this.gridSize = config.gridSize || 3;
    this.targetCount = config.targetCount || 3;
    this.showTime = config.showTime || 2000;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const size = Math.min(window.innerWidth - 40, 600);
    this.canvas.width = size;
    this.canvas.height = size;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    if (this.state !== 'idle') this.render();
  }
  
  start() {
    this.round = 0;
    this.logs = [];
    this.sessionStart = performance.now();
    this.startCountdown();
  }
  
  startCountdown() {
    this.state = 'countdown';
    this.countdownValue = 3;
    this.render();
    this.countdownTimer = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue <= 0) {
        clearInterval(this.countdownTimer);
        this.startRound();
      } else {
        this.render();
      }
    }, 1000);
  }
  
  startRound() {
    this.round++;
    if (this.round > this.maxRounds) {
      this.endGame();
      return;
    }
    
    this.state = 'show';
    this.generateTargets();
    this.currentRoundData = {
      round: this.round,
      gridSize: this.gridSize,
      targetCount: this.targetCount,
      targets: [...this.targets],
      startTime: performance.now(),
      showTime: this.showTime,
      difficulty: this.difficulty,
      clicks: [],
      recallStartTime: null
    };
    
    this.render();
    
    // 展示阶段后进入回忆阶段
    setTimeout(() => {
      this.state = 'recall';
      this.currentRoundData.recallStartTime = performance.now();
      this.userSelections = [];
      this.render();
    }, this.showTime);
  }
  
  generateTargets() {
    const totalCells = this.gridSize * this.gridSize;
    this.targets = [];
    while (this.targets.length < this.targetCount) {
      const idx = Math.floor(Math.random() * totalCells);
      if (!this.targets.includes(idx)) {
        this.targets.push(idx);
      }
    }
  }
  
  handleClick(x, y) {
    if (this.state !== 'recall') return;
    
    const cellSize = this.canvas.width / this.gridSize;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    const idx = row * this.gridSize + col;
    
    if (col < 0 || col >= this.gridSize || row < 0 || row >= this.gridSize) return;
    if (this.userSelections.includes(idx)) return; // 已点击过
    
    this.userSelections.push(idx);
    const isCorrect = this.targets.includes(idx);
    const rt = performance.now() - this.currentRoundData.recallStartTime;
    
    this.currentRoundData.clicks.push({
      idx, col, row, isCorrect, rt: Math.round(rt)
    });
    
    // 如果用户点击了所有目标方块，或者点击了错误方块达一定数量，结束本轮
    const correctClicks = this.userSelections.filter(s => this.targets.includes(s)).length;
    const wrongClicks = this.userSelections.filter(s => !this.targets.includes(s)).length;
    
    if (correctClicks === this.targetCount || wrongClicks >= 3) {
      this.endRound();
    } else {
      this.render();
    }
  }
  
  endRound() {
    this.state = 'feedback';
    
    // 计算统计数据
    const hits = this.userSelections.filter(s => this.targets.includes(s)).length;
    const misses = this.targetCount - hits;
    const falseAlarms = this.userSelections.filter(s => !this.targets.includes(s)).length;
    const accuracy = hits / this.targetCount;
    
    this.currentRoundData.hits = hits;
    this.currentRoundData.misses = misses;
    this.currentRoundData.falseAlarms = falseAlarms;
    this.currentRoundData.accuracy = Math.round(accuracy * 100) / 100;
    this.currentRoundData.totalRecallTime = Math.round(
      performance.now() - this.currentRoundData.recallStartTime
    );
    
    this.logs.push({...this.currentRoundData});
    this.render();
    
    // 自适应调整难度
    this.adjustDifficulty(accuracy);
    
    // 1.5秒后下一回合
    setTimeout(() => {
      this.startRound();
    }, 1500);
  }
  
  adjustDifficulty(accuracy) {
    // 每3轮评估一次
    if (this.round % 3 !== 0) return;
    
    const recentLogs = this.logs.slice(-3);
    const avgAccuracy = recentLogs.reduce((s, l) => s + l.accuracy, 0) / 3;
    
    if (avgAccuracy >= 0.8) {
      // 提升难度
      if (this.targetCount < this.gridSize * this.gridSize - 2) {
        this.targetCount++;
      } else if (this.gridSize < 5) {
        this.gridSize++;
        this.targetCount = Math.floor(this.gridSize * this.gridSize * 0.4);
      }
      this.showTime = Math.max(800, this.showTime - 200);
      this.difficulty = this.getDifficultyLabel();
    } else if (avgAccuracy < 0.4) {
      // 降低难度
      if (this.targetCount > 2) {
        this.targetCount--;
      } else if (this.gridSize > 3) {
        this.gridSize--;
        this.targetCount = 3;
      }
      this.showTime = Math.min(3000, this.showTime + 200);
      this.difficulty = this.getDifficultyLabel();
    }
  }
  
  getDifficultyLabel() {
    if (this.gridSize <= 3 && this.targetCount <= 3 && this.showTime >= 2000) return 'easy';
    if (this.gridSize >= 5 && this.targetCount >= 7 && this.showTime <= 1200) return 'hard';
    return 'medium';
  }
  
  endGame() {
    this.state = 'ended';
    this.render();
    
    // 保存数据到 localStorage
    const results = {
      gameType: 'memory_matrix',
      gameName: '记忆矩阵',
      timestamp: new Date().toISOString(),
      totalRounds: this.maxRounds,
      completedRounds: this.round,
      logs: this.logs,
      summary: {
        totalHits: this.logs.reduce((s, l) => s + l.hits, 0),
        totalMisses: this.logs.reduce((s, l) => s + l.misses, 0),
        totalFalseAlarms: this.logs.reduce((s, l) => s + l.falseAlarms, 0),
        avgAccuracy: Math.round(this.logs.reduce((s, l) => s + l.accuracy, 0) / this.logs.length * 100),
        avgRecallTime: Math.round(this.logs.reduce((s, l) => s + l.totalRecallTime, 0) / this.logs.length),
        finalDifficulty: this.difficulty
      }
    };
    
    localStorage.setItem('brainGameResults', JSON.stringify(results));
    
    // 保存到历史记录
    if (window.BrainHistory) {
      const score = Math.round(avgAccuracy * 10 - avgRecallTime / 100);
      window.BrainHistory.add({ ...results, score });
    }
    
    // 5秒后跳转到结果页
    setTimeout(() => {
      window.location.href = 'results.html';
    }, 5000);
  }
  
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cellSize = w / this.gridSize;
    const gap = Math.max(2, w * 0.006);
    const isMobile = w < 400;
    
    // 清空画布
    ctx.fillStyle = '#E0F2F1';
    ctx.fillRect(0, 0, w, h);
    
    if (this.state === 'countdown') {
      ctx.fillStyle = '#1B4D5C';
      ctx.font = `bold ${w * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.countdownValue, w / 2, h / 2);
      return;
    }
    
    if (this.state === 'show') {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          const idx = r * this.gridSize + c;
          const x = c * cellSize + gap;
          const y = r * cellSize + gap;
          const size = cellSize - gap * 2;
          
          if (this.targets.includes(idx)) {
            ctx.fillStyle = '#3B82F6';
          } else {
            ctx.fillStyle = '#B0BEC5';
          }
          ctx.fillRect(x, y, size, size);
        }
      }
      return;
    }
    
    if (this.state === 'recall') {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          const idx = r * this.gridSize + c;
          const x = c * cellSize + gap;
          const y = r * cellSize + gap;
          const size = cellSize - gap * 2;
          
          if (this.userSelections.includes(idx)) {
            const isCorrect = this.targets.includes(idx);
            ctx.fillStyle = isCorrect ? '#22C55E' : '#EF4444';
          } else {
            ctx.fillStyle = '#B0BEC5';
          }
          ctx.fillRect(x, y, size, size);
        }
      }
      
      ctx.fillStyle = '#1B4D5C';
      const fontSize = isMobile ? w * 0.045 : w * 0.06;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`回合 ${this.round}/${this.maxRounds}`, 10, 10);
      
      const correctSoFar = this.userSelections.filter(s => this.targets.includes(s)).length;
      ctx.fillText(`已找到 ${correctSoFar}/${this.targetCount}`, 10, fontSize + 14);
      return;
    }
    
    if (this.state === 'feedback') {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          const idx = r * this.gridSize + c;
          const x = c * cellSize + gap;
          const y = r * cellSize + gap;
          const size = cellSize - gap * 2;
          
          if (this.userSelections.includes(idx)) {
            const isCorrect = this.targets.includes(idx);
            ctx.fillStyle = isCorrect ? '#22C55E' : '#EF4444';
          } else if (this.targets.includes(idx)) {
            ctx.fillStyle = '#F59E0B';
          } else {
            ctx.fillStyle = '#B0BEC5';
          }
          ctx.fillRect(x, y, size, size);
        }
      }
      
      const hits = this.currentRoundData.hits;
      const misses = this.currentRoundData.misses;
      const falseAlarms = this.currentRoundData.falseAlarms;
      
      ctx.fillStyle = '#1B4D5C';
      const fbFont = isMobile ? w * 0.05 : w * 0.06;
      ctx.font = `bold ${fbFont}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let feedbackText = '';
      if (hits === this.targetCount && falseAlarms === 0) {
        feedbackText = '完美！';
      } else if (hits >= this.targetCount * 0.7) {
        feedbackText = '不错！';
      } else {
        feedbackText = '继续加油！';
      }
      ctx.fillText(feedbackText, w / 2, h / 2);
      
      const detailFont = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `${detailFont}px sans-serif`;
      ctx.fillText(`正确${hits} 遗漏${misses} 误点${falseAlarms}`, w / 2, h / 2 + w * 0.08);
      return;
    }
    
    if (this.state === 'ended') {
      ctx.fillStyle = '#1B4D5C';
      const endFont = isMobile ? w * 0.06 : w * 0.08;
      ctx.font = `bold ${endFont}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('训练完成！', w / 2, h / 2 - 40);
      
      const subFont = isMobile ? w * 0.04 : w * 0.05;
      ctx.font = `${subFont}px sans-serif`;
      ctx.fillText('正在跳转结果页...', w / 2, h / 2 + 20);
      return;
    }
  }
}

// 导出
window.MemoryMatrixGame = GameEngine;
