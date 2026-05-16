/**
 * CFA L1 Sprint Hub - Dashboard & Sprint Analytics
 */

const DASHBOARD = {
  chartInstance: null,

  getExamDate() {
    const stored = localStorage.getItem('examDate');
    if (stored) return new Date(stored);
    return new Date(getNextAugustExamDate());
  },

  setExamDate(dateStr) { localStorage.setItem('examDate', dateStr); },

  getDaysLeft() {
    const exam = this.getExamDate();
    const now = new Date();
    return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  },

  getPhase() {
    const days = this.getDaysLeft();
    if (days > 60) return { key: 'early', name: '基础积累期', badgeClass: 'phase-early' };
    if (days > 30) return { key: 'mid', name: '强化冲刺期', badgeClass: 'phase-mid' };
    if (days > 7) return { key: 'late', name: '考前冲刺期', badgeClass: 'phase-late' };
    if (days > 0) return { key: 'final', name: '最后一周', badgeClass: 'phase-final' };
    return { key: 'done', name: '考试已结束', badgeClass: '' };
  },

  getPhaseDescription() {
    const days = this.getDaysLeft();
    switch (this.getPhase().key) {
      case 'early': return `距离考试还有 ${days} 天。当前处于基础积累期，重点是全面录入错题，建立个人错题库。`;
      case 'mid': return `距离考试还有 ${days} 天，已进入强化冲刺期！重点复盘错题最多的章节。停止刷新题，专注消化已有错题。`;
      case 'late': return `距离考试仅剩 ${days} 天！进入考前冲刺期。只复盘反复做错的典型错题，强化记忆薄弱环节。`;
      case 'final': return `最后 ${days} 天！进入决战模式。只看个人最薄弱、最易遗忘的错题，保持题感，调整作息。`;
      default: return '考试已结束，祝您取得好成绩！';
    }
  },

  getReminderItems() {
    const phase = this.getPhase().key;
    const items = [];
    if (phase === 'early') {
      items.push(
        { icon: 'ph-pencil-simple', title: '持续录入错题', desc: '每天至少录入3-5道错题，保持错题库增长。' },
        { icon: 'ph-arrow-counter-clockwise', title: '及时模拟考试', desc: '每周至少做一次模拟考试，检验是否真正掌握。' },
        { icon: 'ph-chart-bar', title: '关注数据趋势', desc: '定期查看各章节错题分布，提前发现薄弱环节。' }
      );
    } else if (phase === 'mid') {
      items.push(
        { icon: 'ph-arrow-counter-clockwise', title: '高频错题重做', desc: '重点回看错题数量最多的章节，分析共性的知识盲区。' },
        { icon: 'ph-warning', title: '攻克易混点', desc: '整理容易混淆的概念对比表，强化区分记忆。' },
        { icon: 'ph-lightning', title: '滚动复习', desc: '每天抽取20道错题重做，隐藏解析，模拟真实考试状态。' }
      );
    } else if (phase === 'late') {
      items.push(
        { icon: 'ph-target', title: '只攻薄弱点', desc: '停止刷新题，100%精力投入个人错题库中的典型错题。' },
        { icon: 'ph-brain', title: '重做+解析背诵', desc: '做错题时先自己讲一遍解析，再对照标准解析查漏补缺。' },
        { icon: 'ph-clock', title: '模拟节奏', desc: '按真实考试时间做整套错题复盘，训练做题节奏。' }
      );
    } else if (phase === 'final') {
      items.push(
        { icon: 'ph-heart', title: '保持心态', desc: '最后阶段心态比新学知识更重要，保证睡眠和饮食。' },
        { icon: 'ph-list-checks', title: '最薄弱清单', desc: '列出10道典型错题，考前最后过一遍。' },
        { icon: 'ph-prohibit', title: '不刷新题', desc: '绝对不要再碰新题，避免打击信心，只看已掌握内容的记忆唤醒。' }
      );
    }
    return items;
  },

  updateCountdown() {
    const days = this.getDaysLeft();
    document.getElementById('cdDays').textContent = days;
    document.getElementById('cdHours').textContent = '00';
    document.getElementById('cdMinutes').textContent = '00';
    const mini = document.querySelector('#examCountdownMini span');
    if (mini) mini.textContent = `${days}天`;
  },

  updatePhase() {
    const phase = this.getPhase();
    const badge = document.getElementById('phaseBadge');
    const desc = document.getElementById('phaseDesc');
    if (badge) { badge.textContent = phase.name; badge.className = 'phase-badge ' + phase.badgeClass; }
    if (desc) desc.textContent = this.getPhaseDescription();
  },

  async updateStats() {
    const totalErrors = await db.errors.count();
    const errorChapters = await Errors.countByChapter();
    const coveredChapters = Object.keys(errorChapters).length;
    const thisWeek = await Errors.getWeeklyNew();
    const reviewed = await Errors.getTotalReviewed();

    document.getElementById('statTotalErrors').textContent = totalErrors;
    document.getElementById('statChapters').textContent = coveredChapters;
    document.getElementById('statThisWeek').textContent = thisWeek;
    document.getElementById('statReviewed').textContent = reviewed;
  },

  async updateChart() {
    const counts = await Errors.countByChapter();
    const labels = CFA_CHAPTERS.map(c => c.code);
    const data = CFA_CHAPTERS.map(c => counts[c.id] || 0);
    const colors = CFA_CHAPTERS.map((_, i) => `rgba(30, 58, 95, ${data[i] > 0 ? 0.85 : 0.25})`);

    const ctx = document.getElementById('chapterChart');
    if (!ctx) return;
    if (this.chartInstance) this.chartInstance.destroy();

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: '错题数', data, backgroundColor: colors, borderRadius: 4, borderSkipped: false }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f0f0f0' } },
          x: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  },

  async updateWeakChapters() {
    const list = document.getElementById('weakChaptersList');
    const counts = await Errors.countByChapter();
    const sorted = CFA_CHAPTERS.map(c => ({ ...c, count: counts[c.id] || 0 }))
      .filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

    if (sorted.length === 0) {
      list.innerHTML = '<div class="empty-mini">暂无数据，请先录入错题</div>';
      return;
    }
    const max = sorted[0].count;
    list.innerHTML = sorted.map((c, i) => `
      <div class="rank-item">
        <span class="rank-num ${i < 3 ? 'top3' : ''}">${i + 1}</span>
        <span class="rank-name">${c.name}</span>
        <span class="rank-value">${c.count} 题</span>
      </div>
    `).join('');
  },

  updateReminders() {
    const container = document.getElementById('reminderContent');
    const items = this.getReminderItems();
    container.innerHTML = items.map(item => `
      <div class="reminder-item">
        <i class="ph ${item.icon}"></i>
        <div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.desc)}</p>
        </div>
      </div>
    `).join('');
  },

  async refresh() {
    this.updateCountdown();
    this.updatePhase();
    await this.updateStats();
    await this.updateChart();
    await this.updateWeakChapters();
    this.updateReminders();
  }
};

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
