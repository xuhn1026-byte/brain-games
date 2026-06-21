class FlankerBirdGame {
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

    // 难度参数
    this.flankerCount = config.flankerCount || 2; // 单侧干扰数量 (2 = 总共5个箭头)
    this.congruentRatio = config.congruentRatio || 0.5; // 一致条件比例
    this.showTimeout = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const size = Math.min(window.innerWidth - 40, 700);
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

    this.state = 'stimulus';
    this.generateTrial();
    this.currentRoundData = {
      round: this.round,
      flankerCount: this.flankerCount,
      targetDirection: this.targetDirection,
      flankerDirection: this.flankerDirection,
      isCongruent: this.isCongruent,
      isNeutral: this.isNeutral,
      startTime: performance.now(),
      responded: false
    };

    this.render();

    // 超时处理（5秒未响应）
    this.showTimeout = setTimeout(() => {
      if (!this.currentRoundData.responded) {
        this.currentRoundData.responded = true;
        this.currentRoundData.rt = 5000;
        this.currentRoundData.correct = false;
        this.currentRoundData.response = 'timeout';
        this.showFeedback(false, '超时');
      }
    }, 5000);
  }

  generateTrial() {
    const r = Math.random();
    if (r < 0.2) {
      // 20% 中性条件（无干扰箭头）
      this.isNeutral = true;
      this.isCongruent = false;
      this.flankerCount = 0;
    } else if (r < 0.2 + this.congruentRatio * 0.8) {
      // 一致条件
      this.isNeutral = false;
      this.isCongruent = true;
    } else {
      // 不一致条件
      this.isNeutral = false;
      this.isCongruent = false;
    }

    this.targetDirection = Math.random() < 0.5 ? 'left' : 'right';
    this.flankerDirection = this.isCongruent ? this.targetDirection : (this.targetDirection === 'left' ? 'right' : 'left');
  }

  handleInput(direction) {
    if (this.state !== 'stimulus' || this.currentRoundData.responded) return;

    this.currentRoundData.responded = true;
    clearTimeout(this.showTimeout);

    const rt = performance.now() - this.currentRoundData.startTime;
    this.currentRoundData.rt = Math.round(rt);
    this.currentRoundData.response = direction;
    this.currentRoundData.correct = direction === this.targetDirection;

    const isCorrect = this.currentRoundData.correct;
    this.showFeedback(isCorrect, isCorrect ? '正确' : '错误');
  }

  showFeedback(isCorrect, text) {
    this.state = 'feedback';
    this.feedbackText = text;
    this.feedbackCorrect = isCorrect;
    this.render();

    // 保存本轮数据
    this.logs.push({ ...this.currentRoundData });

    // 自适应调整难度
    this.adjustDifficulty();

    // 1秒后下一回合
    setTimeout(() => {
      this.startRound();
    }, 800);
  }

  adjustDifficulty() {
    // 每5轮评估一次
    if (this.round % 5 !== 0) return;

    const recent = this.logs.slice(-5);
    const avgAccuracy = recent.filter(l => l.correct).length / 5;

    if (avgAccuracy >= 0.85) {
      // 提升难度：增加不一致条件比例，增加干扰箭头数量
      if (this.congruentRatio > 0.3) {
        this.congruentRatio -= 0.1;
      } else if (this.flankerCount < 4) {
        this.flankerCount++;
      }
    } else if (avgAccuracy < 0.5) {
      // 降低难度
      if (this.flankerCount > 1) {
        this.flankerCount--;
      }
      this.congruentRatio = Math.min(0.7, this.congruentRatio + 0.1);
    }
  }

  endGame() {
    this.state = 'ended';
    this.render();

    // 计算认知干扰指标
    const congruentLogs = this.logs.filter(l => l.isCongruent && !l.isNeutral);
    const incongruentLogs = this.logs.filter(l => !l.isCongruent && !l.isNeutral);
    const neutralLogs = this.logs.filter(l => l.isNeutral);

    const avgRT = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, l) => s + l.rt, 0) / arr.length) : 0;
    const avgAcc = (arr) => arr.length > 0 ? Math.round(arr.filter(l => l.correct).length / arr.length * 100) : 0;

    const congruentRT = avgRT(congruentLogs);
    const incongruentRT = avgRT(incongruentLogs);
    const neutralRT = avgRT(neutralLogs);
    const interferenceEffect = incongruentRT - congruentRT;

    const results = {
      gameType: 'flanker_bird',
      gameName: '飞鸟注意力',
      timestamp: new Date().toISOString(),
      totalRounds: this.maxRounds,
      completedRounds: this.round,
      logs: this.logs,
      summary: {
        totalCorrect: this.logs.filter(l => l.correct).length,
        totalWrong: this.logs.filter(l => !l.correct).length,
        avgAccuracy: Math.round(this.logs.filter(l => l.correct).length / this.logs.length * 100),
        avgRT: avgRT(this.logs),
        congruentRT,
        incongruentRT,
        neutralRT,
        interferenceEffect,
        congruentAccuracy: avgAcc(congruentLogs),
        incongruentAccuracy: avgAcc(incongruentLogs),
        neutralAccuracy: avgAcc(neutralLogs),
        finalFlankerCount: this.flankerCount
      }
    };

    localStorage.setItem('brainGameResults', JSON.stringify(results));
    
    // 保存到历史记录
    if (window.BrainHistory) {
      const score = Math.round(results.summary.avgAccuracy * 10 - Math.abs(results.summary.interferenceEffect || 0) / 20);
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

    // 背景 - 柔和米色/淡绿色
    ctx.fillStyle = '#E8F5E9';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'countdown') {
      ctx.fillStyle = '#1B5E20';
      ctx.font = `bold ${w * 0.25}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.countdownValue, w / 2, h / 2);
      return;
    }

    if (this.state === 'stimulus') {
      this.renderStimulus(ctx, w, h);
      return;
    }

    if (this.state === 'feedback') {
      this.renderStimulus(ctx, w, h, true);
      ctx.fillStyle = this.feedbackCorrect ? '#2E7D32' : '#C62828';
      const fbSize = isMobile ? w * 0.07 : w * 0.08;
      ctx.font = `bold ${fbSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedbackText, w / 2, h * 0.75);
      return;
    }

    if (this.state === 'ended') {
      ctx.fillStyle = '#1B5E20';
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

  renderStimulus(ctx, w, h, isFeedback = false) {
    const isMobile = w < 400;
    const arrowSize = isMobile ? Math.min(w * 0.14, h * 0.35) : Math.min(w * 0.12, h * 0.3);
    const gap = arrowSize * 0.3;
    const totalArrows = this.isNeutral ? 1 : (this.flankerCount * 2 + 1);
    const totalWidth = totalArrows * arrowSize + (totalArrows - 1) * gap;
    const startX = (w - totalWidth) / 2;
    const y = h / 2;

    const drawArrow = (x, isLeft, isTarget) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.font = `${arrowSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isFeedback) {
        if (isTarget) {
          ctx.fillStyle = '#2E7D32';
        } else {
          ctx.fillStyle = this.isCongruent ? '#81C784' : '#E57373';
        }
      } else {
        ctx.fillStyle = isTarget ? '#1B5E20' : '#388E3C';
      }

      ctx.fillText(isLeft ? '←' : '→', 0, 0);
      ctx.restore();
    };

    if (this.isNeutral) {
      drawArrow(w / 2, this.targetDirection === 'left', true);
    } else {
      let x = startX + arrowSize / 2;
      for (let i = 0; i < totalArrows; i++) {
        const isTarget = i === this.flankerCount;
        const isLeft = isTarget ? (this.targetDirection === 'left') : (this.flankerDirection === 'left');
        drawArrow(x, isLeft, isTarget);
        x += arrowSize + gap;
      }
    }

    if (!isFeedback) {
      ctx.fillStyle = '#1B5E20';
      const progSize = isMobile ? w * 0.035 : w * 0.04;
      ctx.font = `bold ${progSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`回合 ${this.round}/${this.maxRounds}`, 10, 10);
    }
  }

  // 绑定键盘事件
  bindKeyboard() {
    this._keyHandler = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.handleInput('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.handleInput('right');
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  unbindKeyboard() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  // 绑定触摸/点击区域
  bindTouch() {
    this._touchHandler = (e) => {
      if (this.state !== 'stimulus') return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const w = this.canvas.width;
      if (x < w / 2) {
        this.handleInput('left');
      } else {
        this.handleInput('right');
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

window.FlankerBirdGame = FlankerBirdGame;
