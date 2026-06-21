class MemoryMatchGame {
  constructor(canvasId, config) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.config = config;
    this.state = 'idle'; // idle / countdown / show_sequence / show_target / feedback / ended
    this.round = 0;
    this.maxRounds = config.totalRounds || 20;
    this.logs = [];
    this.sessionStart = performance.now();

    // 难度参数
    this.nBack = config.nBack || 1; // 1-back 或 2-back
    this.sequenceLength = config.sequenceLength || 4; // 展示序列长度
    this.symbolSet = config.symbolSet || 'shapes'; // shapes, colors, letters
    this.showTime = config.showTime || 800; // 每个符号展示时间

    this.symbols = {
      shapes: ['○', '△', '□', '◇', '☆', '♡', '♢', '♤'],
      colors: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'],
      letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']
    };

    this.sequence = []; // 当前序列
    this.currentSymbol = null; // 目标符号
    this.isMatch = false; // 目标是否在序列中

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

    this.state = 'show_sequence';
    this.generateSequence();
    this.showSequence();
  }

  generateSequence() {
    const set = this.symbols[this.symbolSet] || this.symbols.shapes;
    this.sequence = [];
    for (let i = 0; i < this.sequenceLength; i++) {
      this.sequence.push(set[Math.floor(Math.random() * set.length)]);
    }

    // 50% 概率目标在序列中
    this.isMatch = Math.random() < 0.5;
    if (this.isMatch) {
      this.currentSymbol = this.sequence[Math.floor(Math.random() * this.sequence.length)];
    } else {
      let newSymbol;
      do {
        newSymbol = set[Math.floor(Math.random() * set.length)];
      } while (this.sequence.includes(newSymbol));
      this.currentSymbol = newSymbol;
    }
  }

  showSequence() {
    this.sequenceIndex = 0;
    this.state = 'show_sequence';
    this.renderSequence();

    const showNext = () => {
      this.sequenceIndex++;
      if (this.sequenceIndex < this.sequence.length) {
        this.renderSequence();
        this.sequenceTimer = setTimeout(showNext, this.showTime);
      } else {
        // 序列展示完毕，进入判断阶段
        this.state = 'show_target';
        this.roundStartTime = performance.now();
        this.render();
      }
    };

    this.sequenceTimer = setTimeout(showNext, this.showTime);
  }

  renderSequence() {
    this.render();
  }

  handleInput(response) {
    if (this.state !== 'show_target') return;

    const rt = performance.now() - this.roundStartTime;
    const correct = (response === 'yes' && this.isMatch) || (response === 'no' && !this.isMatch);

    this.currentRoundData = {
      round: this.round,
      nBack: this.nBack,
      sequenceLength: this.sequenceLength,
      symbolSet: this.symbolSet,
      sequence: [...this.sequence],
      targetSymbol: this.currentSymbol,
      isMatch: this.isMatch,
      response: response,
      correct: correct,
      rt: Math.round(rt),
      startTime: this.roundStartTime
    };

    this.showFeedback(correct);
  }

  showFeedback(isCorrect) {
    this.state = 'feedback';
    this.feedbackCorrect = isCorrect;
    this.render();

    this.logs.push(this.currentRoundData);
    this.adjustDifficulty();

    setTimeout(() => {
      this.startRound();
    }, 1000);
  }

  adjustDifficulty() {
    if (this.round % 5 !== 0) return;

    const recent = this.logs.slice(-5);
    const avgAccuracy = recent.filter(l => l.correct).length / 5;

    if (avgAccuracy >= 0.85) {
      // 提升难度：增加序列长度或切换到更难的符号集
      if (this.sequenceLength < 6) {
        this.sequenceLength++;
      } else if (this.symbolSet === 'shapes') {
        this.symbolSet = 'colors';
      } else if (this.symbolSet === 'colors') {
        this.symbolSet = 'letters';
      }
    } else if (avgAccuracy < 0.5) {
      // 降低难度
      if (this.sequenceLength > 3) {
        this.sequenceLength--;
      } else if (this.symbolSet === 'letters') {
        this.symbolSet = 'colors';
      } else if (this.symbolSet === 'colors') {
        this.symbolSet = 'shapes';
      }
    }
  }

  endGame() {
    this.state = 'ended';
    this.render();

    const correctCount = this.logs.filter(l => l.correct).length;
    const avgRT = this.logs.length > 0 ? Math.round(this.logs.reduce((s, l) => s + l.rt, 0) / this.logs.length) : 0;
    const matchLogs = this.logs.filter(l => l.isMatch);
    const noMatchLogs = this.logs.filter(l => !l.isMatch);
    const matchAcc = matchLogs.length > 0 ? Math.round(matchLogs.filter(l => l.correct).length / matchLogs.length * 100) : 0;
    const noMatchAcc = noMatchLogs.length > 0 ? Math.round(noMatchLogs.filter(l => l.correct).length / noMatchLogs.length * 100) : 0;

    const results = {
      gameType: 'memory_match',
      gameName: '符号配对',
      timestamp: new Date().toISOString(),
      totalRounds: this.maxRounds,
      completedRounds: this.round,
      logs: this.logs,
      summary: {
        totalCorrect: correctCount,
        totalWrong: this.logs.length - correctCount,
        avgAccuracy: Math.round(correctCount / this.logs.length * 100),
        avgRT: avgRT,
        matchAccuracy: matchAcc,
        noMatchAccuracy: noMatchAcc,
        finalNBack: this.nBack,
        finalSequenceLength: this.sequenceLength
      }
    };

    localStorage.setItem('brainGameResults', JSON.stringify(results));

    if (window.BrainHistory) {
      const score = Math.round(results.summary.avgAccuracy * 10 - avgRT / 50);
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

    // 背景 - 紫色系（记忆类游戏）
    ctx.fillStyle = '#F3E8FF';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'countdown') {
      ctx.fillStyle = '#7C3AED';
      ctx.font = `bold ${w * 0.25}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.countdownValue, w / 2, h / 2);
      return;
    }

    if (this.state === 'show_sequence') {
      // 展示序列中的当前符号
      ctx.fillStyle = '#7C3AED';
      const symbolSize = isMobile ? w * 0.2 : w * 0.16;
      ctx.font = `bold ${symbolSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.sequence[this.sequenceIndex] || '?', w / 2, h * 0.4);

      // 进度指示
      const progress = (this.sequenceIndex + 1) / this.sequenceLength;
      ctx.fillStyle = '#DDD6FE';
      ctx.fillRect(w * 0.2, h * 0.65, w * 0.6, 6);
      ctx.fillStyle = '#7C3AED';
      ctx.fillRect(w * 0.2, h * 0.65, w * 0.6 * progress, 6);

      // 提示
      ctx.fillStyle = '#6B7280';
      const hintSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `${hintSize}px sans-serif`;
      ctx.fillText(`记忆序列 ${this.sequenceIndex + 1}/${this.sequenceLength}`, w / 2, h * 0.75);

      // 总进度
      ctx.fillStyle = '#7C3AED';
      const progSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `bold ${progSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`回合 ${this.round}/${this.maxRounds}`, 10, 10);
      return;
    }

    if (this.state === 'show_target') {
      // 展示目标符号
      ctx.fillStyle = '#7C3AED';
      const symbolSize = isMobile ? w * 0.22 : w * 0.18;
      ctx.font = `bold ${symbolSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.currentSymbol || '?', w / 2, h * 0.35);

      // 提示文字
      ctx.fillStyle = '#6B7280';
      const hintSize = isMobile ? w * 0.04 : w * 0.045;
      ctx.font = `${hintSize}px sans-serif`;
      ctx.fillText('这个符号刚才出现过吗？', w / 2, h * 0.58);

      // 操作提示
      ctx.fillStyle = '#9CA3AF';
      const opSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `${opSize}px sans-serif`;
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      ctx.fillText(isTouch ? '点击左半边 = 有    点击右半边 = 没有' : '左键/空格 = 有    右键/回车 = 没有', w / 2, h * 0.72);

      // 进度
      ctx.fillStyle = '#7C3AED';
      const progSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `bold ${progSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`回合 ${this.round}/${this.maxRounds}`, 10, 10);
      return;
    }

    if (this.state === 'feedback') {
      ctx.fillStyle = this.feedbackCorrect ? '#16A34A' : '#DC2626';
      const fbSize = isMobile ? w * 0.07 : w * 0.08;
      ctx.font = `bold ${fbSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedbackCorrect ? '正确！' : '错误！', w / 2, h * 0.45);

      ctx.fillStyle = '#6B7280';
      const detailSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `${detailSize}px sans-serif`;
      const answer = this.isMatch ? '刚才出现过' : '刚才没出现过';
      ctx.fillText(answer, w / 2, h * 0.6);
      return;
    }

    if (this.state === 'ended') {
      ctx.fillStyle = '#7C3AED';
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
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.handleInput('yes');
      } else if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.handleInput('no');
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
      if (this.state !== 'show_target') return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const w = this.canvas.width;
      if (x < w / 2) {
        this.handleInput('yes');
      } else {
        this.handleInput('no');
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

window.MemoryMatchGame = MemoryMatchGame;
