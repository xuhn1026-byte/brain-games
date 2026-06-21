class ColorShapeGame {
  constructor(canvasId, config) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.config = config;
    this.state = 'idle';
    this.round = 0;
    this.maxRounds = config.totalRounds || 20;
    this.logs = [];
    this.sessionStart = performance.now();

    // 颜色与形状定义
    this.colors = [
      { name: 'red', hex: '#EF4444', label: '红' },
      { name: 'blue', hex: '#3B82F6', label: '蓝' },
      { name: 'green', hex: '#10B981', label: '绿' },
      { name: 'yellow', hex: '#F59E0B', label: '黄' },
      { name: 'purple', hex: '#8B5CF6', label: '紫' }
    ];
    this.shapes = [
      { name: 'circle', draw: (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); } },
      { name: 'triangle', draw: (ctx, x, y, r) => { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x - r * 0.866, y + r * 0.5); ctx.lineTo(x + r * 0.866, y + r * 0.5); ctx.closePath(); ctx.fill(); } },
      { name: 'square', draw: (ctx, x, y, r) => { ctx.fillRect(x - r, y - r, r * 2, r * 2); } },
      { name: 'diamond', draw: (ctx, x, y, r) => { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); } },
      { name: 'star', draw: (ctx, x, y, r) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          ctx.lineTo(x + Math.cos((18 + i * 72) * Math.PI / 180) * r, y - Math.sin((18 + i * 72) * Math.PI / 180) * r);
          ctx.lineTo(x + Math.cos((54 + i * 72) * Math.PI / 180) * r * 0.5, y - Math.sin((54 + i * 72) * Math.PI / 180) * r * 0.5);
        }
        ctx.closePath(); ctx.fill();
      } }
    ];

    this.currentRule = null; // 'color' or 'shape'
    this.targetColor = null;
    this.targetShape = null;
    this.optionA = null; // 颜色匹配
    this.optionB = null; // 形状匹配
    this.correctOption = null; // 'A' or 'B'

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const size = Math.min(window.innerWidth - 40, 600);
    this.canvas.width = size;
    this.canvas.height = Math.min(size * 0.7, 450);
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
    if (this.state !== 'idle') this.render();
  }

  start() {
    this.round = 0;
    this.logs = [];
    this.sessionStart = performance.now();
    this.currentRule = null;
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

    // 生成规则：70% 重复，30% 切换
    const prevRule = this.currentRule;
    if (!prevRule || Math.random() < 0.3) {
      this.currentRule = prevRule === 'color' ? 'shape' : 'color';
    }
    // else 保持当前规则

    const isSwitch = prevRule && this.currentRule !== prevRule;

    // 生成目标
    this.targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.targetShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];

    // 生成选项A（颜色匹配，形状不同）
    let diffShape;
    do { diffShape = this.shapes[Math.floor(Math.random() * this.shapes.length)]; }
    while (diffShape.name === this.targetShape.name);
    this.optionA = { color: this.targetColor, shape: diffShape };

    // 生成选项B（形状匹配，颜色不同）
    let diffColor;
    do { diffColor = this.colors[Math.floor(Math.random() * this.colors.length)]; }
    while (diffColor.name === this.targetColor.name);
    this.optionB = { color: diffColor, shape: this.targetShape };

    // 确定正确答案
    this.correctOption = this.currentRule === 'color' ? 'A' : 'B';

    this.roundStartTime = performance.now();
    this.currentRoundData = {
      round: this.round,
      rule: this.currentRule,
      isSwitch: isSwitch,
      targetColor: this.targetColor.name,
      targetShape: this.targetShape.name,
      optionA: { color: this.optionA.color.name, shape: this.optionA.shape.name },
      optionB: { color: this.optionB.color.name, shape: this.optionB.shape.name },
      correctOption: this.correctOption,
      startTime: this.roundStartTime
    };

    this.render();
  }

  handleInput(option) {
    if (this.state !== 'stimulus') return;

    const rt = performance.now() - this.roundStartTime;
    const correct = option === this.correctOption;

    this.currentRoundData.rt = Math.round(rt);
    this.currentRoundData.response = option;
    this.currentRoundData.correct = correct;

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
    // 每5轮评估，调整切换比例
    if (this.round % 5 !== 0) return;

    const recent = this.logs.slice(-5);
    const avgAccuracy = recent.filter(l => l.correct).length / 5;

    // 记录切换成本
    const switchLogs = recent.filter(l => l.isSwitch && l.correct);
    const repeatLogs = recent.filter(l => !l.isSwitch && l.correct);
    const switchRT = switchLogs.length > 0 ? switchLogs.reduce((s, l) => s + l.rt, 0) / switchLogs.length : 0;
    const repeatRT = repeatLogs.length > 0 ? repeatLogs.reduce((s, l) => s + l.rt, 0) / repeatLogs.length : 0;
    const switchCost = switchRT - repeatRT;

    // 难度通过增加切换比例来提升
    // 这里主要由 startRound 中的 30% 切换概率控制
    // 可以动态调整这个比例，但简单起见，保持固定
  }

  endGame() {
    this.state = 'ended';
    this.render();

    const correctCount = this.logs.filter(l => l.correct).length;
    const avgRT = this.logs.length > 0 ? Math.round(this.logs.reduce((s, l) => s + l.rt, 0) / this.logs.length) : 0;

    const switchLogs = this.logs.filter(l => l.isSwitch && l.correct);
    const repeatLogs = this.logs.filter(l => !l.isSwitch && l.correct);
    const switchRT = switchLogs.length > 0 ? Math.round(switchLogs.reduce((s, l) => s + l.rt, 0) / switchLogs.length) : 0;
    const repeatRT = repeatLogs.length > 0 ? Math.round(repeatLogs.reduce((s, l) => s + l.rt, 0) / repeatLogs.length) : 0;
    const switchCost = switchRT - repeatRT;

    const colorLogs = this.logs.filter(l => l.rule === 'color');
    const shapeLogs = this.logs.filter(l => l.rule === 'shape');
    const colorAcc = colorLogs.length > 0 ? Math.round(colorLogs.filter(l => l.correct).length / colorLogs.length * 100) : 0;
    const shapeAcc = shapeLogs.length > 0 ? Math.round(shapeLogs.filter(l => l.correct).length / shapeLogs.length * 100) : 0;

    const results = {
      gameType: 'color_shape',
      gameName: '颜色形状',
      timestamp: new Date().toISOString(),
      totalRounds: this.maxRounds,
      completedRounds: this.round,
      logs: this.logs,
      summary: {
        totalCorrect: correctCount,
        totalWrong: this.logs.length - correctCount,
        avgAccuracy: Math.round(correctCount / this.logs.length * 100),
        avgRT: avgRT,
        switchCost: switchCost,
        switchRT: switchRT,
        repeatRT: repeatRT,
        colorAccuracy: colorAcc,
        shapeAccuracy: shapeAcc,
        switchCount: this.logs.filter(l => l.isSwitch).length
      }
    };

    localStorage.setItem('brainGameResults', JSON.stringify(results));

    if (window.BrainHistory) {
      const score = Math.round(results.summary.avgAccuracy * 10 - Math.abs(switchCost) / 20);
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

    // 背景 - 绿色系（灵活性类游戏）
    ctx.fillStyle = '#D1FAE5';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'countdown') {
      ctx.fillStyle = '#059669';
      ctx.font = `bold ${w * 0.25}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.countdownValue, w / 2, h / 2);
      return;
    }

    if (this.state === 'stimulus') {
      this.renderStimulus(ctx, w, h, isMobile);
      return;
    }

    if (this.state === 'feedback') {
      this.renderStimulus(ctx, w, h, isMobile, true);

      ctx.fillStyle = this.feedbackCorrect ? '#16A34A' : '#DC2626';
      const fbSize = isMobile ? w * 0.07 : w * 0.08;
      ctx.font = `bold ${fbSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedbackCorrect ? '正确！' : '错误！', w / 2, h * 0.15);
      return;
    }

    if (this.state === 'ended') {
      ctx.fillStyle = '#059669';
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

  renderStimulus(ctx, w, h, isMobile, isFeedback = false) {
    const shapeSize = isMobile ? w * 0.1 : w * 0.08;

    // 规则提示
    ctx.fillStyle = '#059669';
    const ruleSize = isMobile ? w * 0.045 : w * 0.05;
    ctx.font = `bold ${ruleSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ruleText = this.currentRule === 'color' ? '按颜色匹配' : '按形状匹配';
    ctx.fillText(ruleText, w / 2, h * 0.12);

    if (this.currentRoundData?.isSwitch && !isFeedback) {
      ctx.fillStyle = '#F59E0B';
      const switchSize = isMobile ? w * 0.03 : w * 0.035;
      ctx.font = `bold ${switchSize}px sans-serif`;
      ctx.fillText('⚡ 规则切换！', w / 2, h * 0.2);
    }

    // 目标形状
    if (this.targetColor && this.targetShape) {
      ctx.fillStyle = this.targetColor.hex;
      this.targetShape.draw(ctx, w / 2, h * 0.35, shapeSize);

      // 目标标签
      ctx.fillStyle = '#6B7280';
      const labelSize = isMobile ? w * 0.03 : w * 0.035;
      ctx.font = `${labelSize}px sans-serif`;
      ctx.fillText(`目标: ${this.targetColor.label}${this.targetShape.name === 'circle' ? '圆' : this.targetShape.name === 'triangle' ? '三角' : this.targetShape.name === 'square' ? '方' : this.targetShape.name === 'diamond' ? '菱' : '星'}`, w / 2, h * 0.48);
    }

    if (!isFeedback) {
      // 选项区域
      const optionY = h * 0.65;
      const optionGap = w * 0.3;
      const optionX1 = w / 2 - optionGap;
      const optionX2 = w / 2 + optionGap;

      // 选项A
      if (this.optionA) {
        ctx.fillStyle = this.optionA.color.hex;
        this.optionA.shape.draw(ctx, optionX1, optionY, shapeSize * 0.8);

        ctx.fillStyle = '#6B7280';
        const optSize = isMobile ? w * 0.03 : w * 0.035;
        ctx.font = `${optSize}px sans-serif`;
        ctx.fillText('A', optionX1, optionY + shapeSize + 16);
      }

      // 选项B
      if (this.optionB) {
        ctx.fillStyle = this.optionB.color.hex;
        this.optionB.shape.draw(ctx, optionX2, optionY, shapeSize * 0.8);

        ctx.fillStyle = '#6B7280';
        const optSize = isMobile ? w * 0.03 : w * 0.035;
        ctx.font = `${optSize}px sans-serif`;
        ctx.fillText('B', optionX2, optionY + shapeSize + 16);
      }

      // 操作提示
      ctx.fillStyle = '#9CA3AF';
      const hintSize = isMobile ? w * 0.03 : w * 0.035;
      ctx.font = `${hintSize}px sans-serif`;
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      ctx.fillText(isTouch ? '点击左 = A    点击右 = B' : '左键/空格 = A    右键/回车 = B', w / 2, h * 0.88);
    }

    // 进度
    ctx.fillStyle = '#059669';
    const progSize = isMobile ? w * 0.035 : w * 0.04;
    ctx.font = `bold ${progSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`回合 ${this.round}/${this.maxRounds}`, 10, 10);
  }

  bindKeyboard() {
    this._keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.handleInput('A');
      } else if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.handleInput('B');
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
        this.handleInput('A');
      } else {
        this.handleInput('B');
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

window.ColorShapeGame = ColorShapeGame;
