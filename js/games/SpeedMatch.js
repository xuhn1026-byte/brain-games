class SpeedMatchGame {
  constructor(canvasId, config) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.config = config;
    this.state = 'idle'; // idle / countdown / stimulus / feedback / ended
    this.round = 0;
    this.maxRounds = config.totalRounds || 20;
    this.logs = [];
    this.sessionStart = performance.now();
    this.currentRoundData = null;
    this.prevSymbol = null;
    this.currentSymbol = null;

    // 难度参数
    this.symbolSet = config.symbolSet || 'shapes'; // shapes, colors, letters
    this.showTimeout = null;

    this.symbols = {
      shapes: ['○', '△', '□', '◇', '☆', '♡', '♢', '♤'],
      colors: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'],
      letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const size = Math.min(window.innerWidth - 40, 600);
    this.canvas.width = size;
    this.canvas.height = Math.min(size * 0.6, 400);
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
    if (this.state !== 'idle') this.render();
  }

  start() {
    this.round = 0;
    this.logs = [];
    this.prevSymbol = null;
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

    this.state = 'stimulus';
    this.generateSymbol();

    const isSame = this.currentSymbol === this.prevSymbol;
    this.currentRoundData = {
      round: this.round,
      symbol: this.currentSymbol,
      prevSymbol: this.prevSymbol,
      isSame: isSame,
      symbolSet: this.symbolSet,
      startTime: performance.now(),
      responded: false
    };

    this.render();

    // 超时处理（4秒）
    this.showTimeout = setTimeout(() => {
      if (!this.currentRoundData.responded) {
        this.currentRoundData.responded = true;
        this.currentRoundData.rt = 4000;
        this.currentRoundData.correct = false;
        this.currentRoundData.response = 'timeout';
        this.showFeedback(false, '超时');
      }
    }, 4000);
  }

  generateSymbol() {
    const set = this.symbols[this.symbolSet] || this.symbols.shapes;
    if (this.round === 1 || Math.random() < 0.5) {
      // 50%概率不同，或者第一轮必定不同（因为prev是null）
      let newSymbol;
      do {
        newSymbol = set[Math.floor(Math.random() * set.length)];
      } while (newSymbol === this.prevSymbol);
      this.currentSymbol = newSymbol;
    } else {
      // 相同
      this.currentSymbol = this.prevSymbol;
    }
  }

  handleInput(response) {
    if (this.state !== 'stimulus' || this.currentRoundData.responded) return;

    this.currentRoundData.responded = true;
    clearTimeout(this.showTimeout);

    const rt = performance.now() - this.currentRoundData.startTime;
    this.currentRoundData.rt = Math.round(rt);
    this.currentRoundData.response = response;

    const isSame = this.currentSymbol === this.prevSymbol;
    this.currentRoundData.correct = (response === 'same' && isSame) || (response === 'different' && !isSame);

    const isCorrect = this.currentRoundData.correct;
    this.showFeedback(isCorrect, isCorrect ? '正确' : '错误');
  }

  showFeedback(isCorrect, text) {
    this.state = 'feedback';
    this.feedbackText = text;
    this.feedbackCorrect = isCorrect;
    this.render();

    // 保存前一轮符号
    this.prevSymbol = this.currentSymbol;

    // 保存本轮数据
    this.logs.push({ ...this.currentRoundData });

    // 自适应调整难度
    this.adjustDifficulty();

    // 1.2秒后下一回合
    setTimeout(() => {
      this.startRound();
    }, 1200);
  }

  adjustDifficulty() {
    // 每5轮评估一次
    if (this.round % 5 !== 0) return;

    const recent = this.logs.slice(-5);
    const avgAccuracy = recent.filter(l => l.correct).length / 5;

    if (avgAccuracy >= 0.85) {
      // 提升难度：切换到更多符号的集合
      if (this.symbolSet === 'shapes') {
        this.symbolSet = 'colors';
      } else if (this.symbolSet === 'colors') {
        this.symbolSet = 'letters';
      }
    } else if (avgAccuracy < 0.5) {
      // 降低难度
      if (this.symbolSet === 'letters') {
        this.symbolSet = 'colors';
      } else if (this.symbolSet === 'colors') {
        this.symbolSet = 'shapes';
      }
    }
  }

  endGame() {
    this.state = 'ended';
    this.render();

    const avgRT = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, l) => s + l.rt, 0) / arr.length) : 0;
    const sameLogs = this.logs.filter(l => l.isSame);
    const diffLogs = this.logs.filter(l => !l.isSame);

    const results = {
      gameType: 'speed_match',
      gameName: '快速匹配',
      timestamp: new Date().toISOString(),
      totalRounds: this.maxRounds,
      completedRounds: this.round,
      logs: this.logs,
      summary: {
        totalCorrect: this.logs.filter(l => l.correct).length,
        totalWrong: this.logs.filter(l => !l.correct).length,
        avgAccuracy: Math.round(this.logs.filter(l => l.correct).length / this.logs.length * 100),
        avgRT: avgRT(this.logs),
        sameRT: avgRT(sameLogs),
        diffRT: avgRT(diffLogs),
        sameAccuracy: sameLogs.length > 0 ? Math.round(sameLogs.filter(l => l.correct).length / sameLogs.length * 100) : 0,
        diffAccuracy: diffLogs.length > 0 ? Math.round(diffLogs.filter(l => l.correct).length / diffLogs.length * 100) : 0,
        finalSymbolSet: this.symbolSet
      }
    };

    localStorage.setItem('brainGameResults', JSON.stringify(results));
    
    // 保存到历史记录
    if (window.BrainHistory) {
      const score = Math.round(results.summary.avgAccuracy * 10 - results.summary.avgRT / 50);
      window.BrainHistory.add({ ...results, score });
    }
    
    setTimeout(() => {
      window.location.href = 'results.html';
    }, 5000);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const isMobile = w < 400;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // 背景 - 暖黄色调（速度类游戏常用）
    ctx.fillStyle = '#FFF8E1';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'countdown') {
      ctx.fillStyle = '#E65100';
      ctx.font = `bold ${w * 0.25}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.countdownValue, w / 2, h / 2);
      return;
    }

    if (this.state === 'stimulus') {
      // 显示当前符号 - 移动端更大
      const symbolSize = isMobile ? w * 0.25 : w * 0.2;
      ctx.fillStyle = '#E65100';
      ctx.font = `bold ${symbolSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.currentSymbol || '?', w / 2, h * 0.32);

      // 提示文字
      ctx.fillStyle = '#5D4037';
      const hintSize = isMobile ? w * 0.045 : w * 0.04;
      ctx.font = `${hintSize}px sans-serif`;
      ctx.fillText('与前一个相同？', w / 2, h * 0.58);

      // 显示按钮提示 - 移动端显示触摸提示，桌面显示键盘提示
      ctx.font = `${hintSize * 0.85}px sans-serif`;
      ctx.fillStyle = '#8D6E63';
      const hintText = isTouch
        ? '点击左半边 = 相同    点击右半边 = 不同'
        : '空格/左键 = 相同    回车/右键 = 不同';
      ctx.fillText(hintText, w / 2, h * 0.72);

      // 进度
      ctx.fillStyle = '#E65100';
      const progSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `bold ${progSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`回合 ${this.round}/${this.maxRounds}`, 10, 10);
      return;
    }

    if (this.state === 'feedback') {
      // 显示符号
      const symbolSize = isMobile ? w * 0.25 : w * 0.2;
      ctx.fillStyle = '#E65100';
      ctx.font = `bold ${symbolSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.currentSymbol || '?', w / 2, h * 0.32);

      // 反馈
      ctx.fillStyle = this.feedbackCorrect ? '#2E7D32' : '#C62828';
      const fbSize = isMobile ? w * 0.07 : w * 0.08;
      ctx.font = `bold ${fbSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedbackText, w / 2, h * 0.62);
      return;
    }

    if (this.state === 'ended') {
      ctx.fillStyle = '#E65100';
      const endSize = isMobile ? w * 0.06 : w * 0.07;
      ctx.font = `bold ${endSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('训练完成！', w / 2, h / 2 - 30);
      const subSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `${subSize}px sans-serif`;
      ctx.fillText('正在跳转结果页...', w / 2, h / 2 + 20);
      return;
    }
  }

  bindKeyboard() {
    this._keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'ArrowLeft') {
        e.preventDefault();
        this.handleInput('same');
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.handleInput('different');
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  unbindKeyboard() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  bindTouch() {
    this._touchHandler = (e) => {
      if (this.state !== 'stimulus') return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const w = this.canvas.width;
      if (x < w / 2) {
        this.handleInput('same');
      } else {
        this.handleInput('different');
      }
    };
    this.canvas.addEventListener('click', this._touchHandler);
    this.canvas.addEventListener('touchstart', this._touchHandler, { passive: false });
  }

  unbindTouch() {
    if (this._touchHandler) {
      this.canvas.removeEventListener('click', this._touchHandler);
      this.canvas.removeEventListener('touchstart', this._touchHandler);
    }
  }
}

window.SpeedMatchGame = SpeedMatchGame;
