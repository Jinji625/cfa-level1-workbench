// app-core.js - Core UI logic for CFA L1 Error Hub

function parseQuestionAndOptions(text) {
  const lines = text.split('\n');
  const questionLines = [];
  const options = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^([A-Da-d])[\.、\)\:]\s*(.*)$/);
    if (m) {
      options.push(m[2]);
    } else {
      questionLines.push(line);
    }
  }
  return {
    question: questionLines.join('\n').trim(),
    options: options
  };
}

function mergeQuestionAndOptions(question, options) {
  if (!options || options.length === 0) return question || '';
  const prefixed = options.map((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    const trimmed = (opt || '').trim();
    if (/^[A-Da-d][\.、\)\:]\s*/.test(trimmed)) return trimmed;
    return letter + '. ' + trimmed;
  });
  return (question || '') + '\n\n' + prefixed.join('\n');
}

function saveManualError() {
  const rawText = document.getElementById('errorQuestion').value.trim();
  const chapter = document.getElementById('errorChapter').value;
  const qType = document.getElementById('errorType').value;
  if (!rawText) { showToast('请填写题目内容', 'warning'); return; }
  const parsed = qType === 'choice' ? parseQuestionAndOptions(rawText) : { question: rawText, options: [] };
  const officialHtml = AppState.quillNew ? AppState.quillNew.root.innerHTML : '';
  const data = {
    chapterId: chapter,
    title: parsed.question.slice(0, 40) + (parsed.question.length > 40 ? '...' : ''),
    question: parsed.question,
    questionType: qType,
    myAnswer: document.getElementById('errorMyAnswer').value.trim().toUpperCase(),
    officialExplanation: officialHtml,
    tags: document.getElementById('errorTags').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  if (qType === 'choice') {
    data.options = parsed.options;
    data.correctAnswer = document.getElementById('errorCorrectAnswer').value.trim().toUpperCase();
  } else {
    data.options = [];
    data.fillBlanks = document.getElementById('errorFillAnswers').value.trim().split('\n').filter(Boolean);
    data.correctAnswer = data.fillBlanks.join('; ').toUpperCase();
  }
  Errors.add(data).then(() => {
    closeAllModals();
    showToast('错题已保存', 'success');
    clearErrorForm();
    if (AppState.currentView === 'library') renderLibrary();
    if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
  });
}

function clearErrorForm() {
  document.getElementById('errorQuestion').value = '';
  document.getElementById('errorFillAnswers').value = '';
  document.getElementById('errorMyAnswer').value = '';
  document.getElementById('errorCorrectAnswer').value = '';
  document.getElementById('errorTags').value = '';
  if (AppState.quillNew) AppState.quillNew.setContents([]);
  document.getElementById('errorType').value = 'choice';
  toggleQuestionTypeFields('choice');
}

function populateChapterSelects() {
  const html = CFA_CHAPTERS.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
  const el = document.getElementById('errorChapter');
  if (el) el.innerHTML = html;
}

// ========================
// Word Import
// ========================

function initWordImport() {
  document.getElementById('btnWordImport').addEventListener('click', () => {
    populateChapterSelectsWord();
    openModal('modalWordImport');
  });
  document.getElementById('wordFileInput').addEventListener('change', handleWordFile);
  document.getElementById('btnImportWordText').addEventListener('click', importFromWordText);
}

function populateChapterSelectsWord() {
  const el = document.getElementById('wordImportChapter');
  if (el) el.innerHTML = CFA_CHAPTERS.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
}

async function handleWordFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    document.getElementById('wordExtractedText').value = result.value;
    showToast('Word 文本提取完成，请确认后导入', 'success');
  } catch (err) {
    showToast('Word 解析失败: ' + err.message, 'error');
  }
}

async function importFromWordText() {
  const text = document.getElementById('wordExtractedText').value.trim();
  const chapter = document.getElementById('wordImportChapter').value;
  const marker = document.getElementById('wordSplitMarker').value.trim();
  if (!text) { showToast('没有可导入的内容', 'warning'); return; }

  let blocks = [];
  if (marker) {
    const parts = text.split(marker).filter(s => s.trim());
    blocks = parts.map((p, i) => (i === 0 && !text.startsWith(marker) ? p : marker + p));
  } else {
    blocks = [text];
  }

  let count = 0;
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length < 20) continue;
    const parsed = parseQuestionAndOptions(trimmed);
    await Errors.add({
      chapterId: chapter,
      title: parsed.question.slice(0, 40).replace(/\n/g, ' ') + (parsed.question.length > 40 ? '...' : ''),
      question: parsed.question,
      questionType: 'choice',
      options: parsed.options,
      myAnswer: '',
      correctAnswer: '',
      officialExplanation: '',
      tags: []
    });
    count++;
  }

  closeAllModals();
  showToast('成功导入 ' + count + ' 道错题', 'success');
  if (AppState.currentView === 'library') renderLibrary();
  if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
}

// ========================
// Question Type Toggle
// ========================

function initQuestionTypeToggle() {
  const el = document.getElementById('errorType');
  if (el) el.addEventListener('change', e => toggleQuestionTypeFields(e.target.value));
  const editEl = document.getElementById('editErrorType');
  if (editEl) editEl.addEventListener('change', e => toggleEditQuestionTypeFields(e.target.value));
}

function toggleQuestionTypeFields(type) {
  const show = v => document.getElementById(v)?.classList.remove('hidden');
  const hide = v => document.getElementById(v)?.classList.add('hidden');
  if (type === 'choice') {
    show('groupCorrectAnswer'); hide('groupFillAnswers');
  } else {
    hide('groupCorrectAnswer'); show('groupFillAnswers');
  }
}

function toggleEditQuestionTypeFields(type) {
  const show = v => document.getElementById(v)?.classList.remove('hidden');
  const hide = v => document.getElementById(v)?.classList.add('hidden');
  if (type === 'choice') {
    show('editGroupCorrectAnswer'); hide('editGroupFillAnswers');
  } else {
    hide('editGroupCorrectAnswer'); show('editGroupFillAnswers');
  }
}

// ========================
// Review / Exam Mode
// ========================

let examTimerInterval = null;

function initReviewMode() {
  document.getElementById('btnStartReview').addEventListener('click', startReviewSession);
  document.getElementById('btnReviewAgain').addEventListener('click', () => { resetReviewUI(); });
  document.getElementById('btnReviewBack').addEventListener('click', () => { location.hash = 'dashboard'; });
  const flagBtn = document.getElementById('btnExamFlag');
  if (flagBtn) flagBtn.addEventListener('click', examToggleFlag);
  const prevBtn = document.getElementById('btnExamPrev');
  if (prevBtn) prevBtn.addEventListener('click', examPrev);
  const nextBtn = document.getElementById('btnExamNext');
  if (nextBtn) nextBtn.addEventListener('click', examNext);
  const submitBtn = document.getElementById('btnExamSubmit');
  if (submitBtn) submitBtn.addEventListener('click', examSubmit);
}

function resetReviewUI() {
  document.getElementById('reviewSetup').classList.remove('hidden');
  document.getElementById('reviewSession').classList.add('hidden');
  document.getElementById('reviewSummary').classList.add('hidden');
  if (examTimerInterval) { clearInterval(examTimerInterval); examTimerInterval = null; }
  AppState.reviewSession = null;
}

async function startReviewSession() {
  const scope = document.getElementById('reviewScope').value;
  const count = parseInt(document.getElementById('reviewCount').value);
  const order = document.getElementById('reviewOrder').value;

  let allErrors = await Errors.list();
  if (allErrors.length === 0) { showToast('错题库为空，请先录入错题', 'warning'); return; }

  if (scope !== 'all') {
    if (scope === 'weak') {
      const counts = await Errors.countByChapter();
      const sorted = CFA_CHAPTERS.map(c => ({ id: c.id, count: counts[c.id] || 0 }))
        .filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 3).map(c => c.id);
      allErrors = allErrors.filter(e => sorted.includes(e.chapterId));
    } else {
      allErrors = allErrors.filter(e => e.chapterId === scope);
    }
  }

  if (allErrors.length === 0) { showToast('该范围内没有错题', 'warning'); return; }

  if (order === 'random') {
    allErrors = allErrors.sort(() => Math.random() - 0.5);
  } else if (order === 'time') {
    allErrors = allErrors.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else {
    const orderMap = {};
    CFA_CHAPTERS.forEach((c, i) => orderMap[c.id] = i);
    allErrors = allErrors.sort((a, b) => (orderMap[a.chapterId] || 0) - (orderMap[b.chapterId] || 0));
  }

  const selected = count >= allErrors.length ? allErrors : allErrors.slice(0, count);

  AppState.reviewSession = {
    errors: selected,
    currentIndex: 0,
    answers: {},      // { questionIndex: selectedOptionIndex or [fill answers] }
    flags: new Set(), // Set of questionIndex
    strikes: {},      // { questionIndex: Set(optionIndex) }
    revealed: false,
    startTime: Date.now(),
    submitted: false
  };

  document.getElementById('reviewSetup').classList.add('hidden');
  document.getElementById('reviewSession').classList.remove('hidden');
  document.getElementById('reviewSummary').classList.add('hidden');
  startExamTimer();
  renderExamQuestion();
  renderExamNavGrid();
}

function startExamTimer() {
  const session = AppState.reviewSession;
  const totalMinutes = session.errors.length * 1.5; // 1.5 min per question like CFA L1
  let secondsLeft = Math.round(totalMinutes * 60);
  const timerEl = document.getElementById('examTimer');

  function update() {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    if (secondsLeft <= 0) {
      clearInterval(examTimerInterval);
      showToast('考试时间到，自动交卷', 'warning');
      examSubmit();
    }
    secondsLeft--;
  }
  update();
  examTimerInterval = setInterval(update, 1000);
}

function renderExamQuestion() {
  const session = AppState.reviewSession;
  const error = session.errors[session.currentIndex];
  const total = session.errors.length;
  const current = session.currentIndex + 1;

  document.getElementById('examQuestionNum').textContent = 'Question ' + current + ' of ' + total;
  const chapter = Chapters.getById(error.chapterId);
  document.getElementById('examQuestionTopic').textContent = chapter ? chapter.name : error.chapterId;

  // Question content (render html for tables, but escape plain text)
  const qContent = document.getElementById('examQuestionContent');
  qContent.innerHTML = formatQuestionContent(error.question || '');

  // Flag button state
  const flagBtn = document.getElementById('btnExamFlag');
  flagBtn.classList.toggle('flagged', session.flags.has(session.currentIndex));

  // Answer area
  const answerArea = document.getElementById('examAnswerArea');
  const qType = error.questionType || 'choice';

  if (qType === 'choice') {
    renderChoiceOptions(answerArea, error, session);
  } else {
    renderFillBlanks(answerArea, error, session);
  }

  // Update nav highlight
  document.querySelectorAll('.exam-nav-item').forEach((el, i) => {
    el.classList.toggle('current', i === session.currentIndex);
  });

  // Button states
  document.getElementById('btnExamPrev').disabled = session.currentIndex === 0;
  document.getElementById('btnExamNext').disabled = session.currentIndex === total - 1;
}

function formatQuestionContent(text) {
  if (!text) return '';
  // If already contains HTML tags, assume it's safe HTML (from rich editor)
  if (/<[a-z][^>]*>/i.test(text)) {
    return text;
  }
  // Otherwise escape and preserve line breaks
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function renderChoiceOptions(container, error, session) {
  const idx = session.currentIndex;
  const selected = session.answers[idx];
  const struck = session.strikes[idx] || new Set();

  let html = '<div class="exam-options-label">Select one:</div>';
  html += '<div class="exam-options-list">';
  if (error.options?.length) {
    error.options.forEach((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      const isSelected = selected === i;
      const isStruck = struck.has(i);
      let extraClass = '';
      if (session.submitted) {
        const correct = (error.correctAnswer || '').trim().toUpperCase();
        if (letter === correct) extraClass = 'correct';
        else if (isSelected && letter !== correct) extraClass = 'wrong';
      }
      const cleanOpt = (opt || '').trim().replace(/^[A-Da-d][\.、\)\:]\s*/, '');
      html += '<div class="exam-option ' + (isSelected ? 'selected' : '') + ' ' + (isStruck ? 'striked' : '') + ' ' + extraClass + '" data-idx="' + i + '" onclick="examSelectOption(' + i + ')">' +
        '<input type="radio" name="examOpt" ' + (isSelected ? 'checked' : '') + ' onclick="event.stopPropagation();examSelectOption(' + i + ')" ' + (session.submitted ? 'disabled' : '') + '>' +
        '<span class="exam-option-label">' + letter + '.</span>' +
        '<span class="exam-option-text">' + escapeHtml(cleanOpt) + '</span>' +
        (session.submitted ? '' : '<button class="exam-option-strike" onclick="event.stopPropagation();examToggleStrike(' + i + ')" title="划掉此选项">划掉</button>') +
        '</div>';
    });
  } else {
    html += '<p style="color:var(--text-muted);font-size:13px;">本题没有选项记录。</p>';
  }
  html += '</div>';

  // Reveal section (only after submit)
  if (session.submitted) {
    html += '<div class="exam-reveal">';
    html += '<div class="exam-reveal-banner">';
    if (error.correctAnswer) {
      html += '<div class="answer-block correct"><div class="answer-label">正确答案</div><div class="answer-value" style="color:var(--success);">' + escapeHtml((error.correctAnswer || "").toUpperCase()) + '</div></div>';
    }
    if (error.myAnswer) {
      html += '<div class="answer-block wrong"><div class="answer-label">我原来的答案</div><div class="answer-value" style="color:var(--danger);">' + escapeHtml((error.myAnswer || "").toUpperCase()) + '</div></div>';
    }
    html += '</div>';
    if (error.officialExplanation) {
      html += '<div class="detail-section"><h4>官方解析 / 我的备注</h4><div class="detail-content">' + error.officialExplanation + '</div></div>';
    }
    html += '</div>';
  }

  container.innerHTML = html;
}

function renderFillBlanks(container, error, session) {
  const idx = session.currentIndex;
  const answers = session.answers[idx] || [];
  const blanks = error.fillBlanks || [];
  const count = Math.max(blanks.length, (error.question || '').split('____').length - 1, 1);

  let html = '<div class="exam-options-label">Fill in the blank(s):</div>';
  html += '<div class="exam-fillblank-list">';
  for (let i = 0; i < count; i++) {
    const val = answers[i] || '';
    const correctAns = (blanks[i] || '').trim().toLowerCase();
    const userAns = val.trim().toLowerCase();
    let inputClass = '';
    if (session.submitted) {
      inputClass = userAns === correctAns ? 'correct' : 'wrong';
    }
    html += '<div class="exam-fillblank-item">' +
      '<span class="exam-fillblank-label">Blank ' + (i + 1) + '</span>' +
      '<input type="text" class="exam-fillblank-input ' + inputClass + '" data-blank="' + i + '" value="' + escapeHtml(val) + '" placeholder="输入答案..." oninput="examFillInput(' + i + ', this.value)" ' + (session.submitted ? 'disabled' : '') + '>' +
      (session.submitted ? '<span class="exam-fillblank-answer">' + escapeHtml(blanks[i] || '') + '</span>' : '') +
      '</div>';
  }
  html += '</div>';

  if (session.submitted) {
    html += '<div class="exam-reveal">';
    html += '<div class="exam-reveal-banner">';
    html += '<div class="answer-block correct"><div class="answer-label">正确答案</div><div class="answer-value" style="color:var(--success);">' + escapeHtml(blanks.join(' / ') || '未设置') + '</div></div>';
    if (error.myAnswer) {
      html += '<div class="answer-block wrong"><div class="answer-label">我原来的答案</div><div class="answer-value" style="color:var(--danger);">' + escapeHtml((error.myAnswer || "").toUpperCase()) + '</div></div>';
    }
    html += '</div>';
    if (error.officialExplanation) {
      html += '<div class="detail-section"><h4>官方解析 / 我的备注</h4><div class="detail-content">' + error.officialExplanation + '</div></div>';
    }
    html += '</div>';
  }

  container.innerHTML = html;
}

function examSelectOption(idx) {
  if (AppState.reviewSession.submitted) return;
  AppState.reviewSession.answers[AppState.reviewSession.currentIndex] = idx;
  renderExamQuestion();
  renderExamNavGrid();
}

function examToggleStrike(idx) {
  const session = AppState.reviewSession;
  if (session.submitted) return;
  const key = session.currentIndex;
  if (!session.strikes[key]) session.strikes[key] = new Set();
  const set = session.strikes[key];
  if (set.has(idx)) set.delete(idx); else set.add(idx);
  renderExamQuestion();
}

function examToggleFlag() {
  const session = AppState.reviewSession;
  const idx = session.currentIndex;
  if (session.flags.has(idx)) session.flags.delete(idx); else session.flags.add(idx);
  document.getElementById('btnExamFlag').classList.toggle('flagged', session.flags.has(idx));
  renderExamNavGrid();
}

function examFillInput(blankIdx, value) {
  const session = AppState.reviewSession;
  const key = session.currentIndex;
  if (!session.answers[key]) session.answers[key] = [];
  session.answers[key][blankIdx] = value;
  renderExamNavGrid();
}

function examGoTo(idx) {
  AppState.reviewSession.currentIndex = idx;
  renderExamQuestion();
}

function examPrev() {
  const session = AppState.reviewSession;
  if (session.currentIndex > 0) {
    session.currentIndex--;
    renderExamQuestion();
  }
}

function examNext() {
  const session = AppState.reviewSession;
  if (session.currentIndex < session.errors.length - 1) {
    session.currentIndex++;
    renderExamQuestion();
  }
}

function renderExamNavGrid() {
  const session = AppState.reviewSession;
  const total = session.errors.length;
  let html = '';
  for (let i = 0; i < total; i++) {
    const error = session.errors[i];
    const qType = error.questionType || 'choice';
    let answered = false;
    if (qType === 'choice') {
      answered = session.answers[i] !== undefined;
    } else {
      const arr = session.answers[i] || [];
      answered = arr.some(v => v && v.trim());
    }
    const flagged = session.flags.has(i);
    const current = i === session.currentIndex;
    html += '<div class="exam-nav-item ' + (current ? 'current' : '') + ' ' + (answered ? 'answered' : '') + ' ' + (flagged ? 'flagged' : '') + '" onclick="examGoTo(' + i + ')">' + (i + 1) + '</div>';
  }
  document.getElementById('examNavGrid').innerHTML = html;
}

async function examSubmit() {
  const session = AppState.reviewSession;
  if (session.submitted) {
    showToast('已经交卷了', 'info');
    return;
  }

  const unanswered = session.errors.filter((_, i) => {
    const qType = session.errors[i].questionType || 'choice';
    if (qType === 'choice') return session.answers[i] === undefined;
    const arr = session.answers[i] || [];
    return !arr.some(v => v && v.trim());
  }).length;
  if (unanswered > 0) {
    if (!confirm('还有 ' + unanswered + ' 道题未作答，确定要交卷吗？')) return;
  }

  if (examTimerInterval) { clearInterval(examTimerInterval); examTimerInterval = null; }
  session.submitted = true;

  // Grade answers
  const results = [];
  for (let i = 0; i < session.errors.length; i++) {
    const error = session.errors[i];
    const qType = error.questionType || 'choice';
    let isCorrect = false;
    if (qType === 'choice') {
      const selectedIdx = session.answers[i];
      if (selectedIdx !== undefined && error.options && error.options[selectedIdx]) {
        const selectedText = error.options[selectedIdx];
        const correct = (error.correctAnswer || '').trim().toUpperCase();
        const letter = String.fromCharCode(65 + selectedIdx);
        isCorrect = letter === correct || selectedText.startsWith(correct);
      }
    } else {
      const userAnswers = session.answers[i] || [];
      const correctAnswers = error.fillBlanks || [];
      if (correctAnswers.length > 0 && userAnswers.length >= correctAnswers.length) {
        isCorrect = correctAnswers.every((ans, idx) => {
          const ua = (userAnswers[idx] || '').trim().toLowerCase();
          const ca = (ans || '').trim().toLowerCase();
          return ua === ca;
        });
      }
    }
    results.push({ errorId: error.id, isCorrect });
    await ReviewHistory.add(error.id, isCorrect);
    await Errors.update(error.id, {
      reviewCount: (error.reviewCount || 0) + 1,
      lastReviewedAt: Date.now()
    });
  }
  session.results = results;

  // Show summary
  document.getElementById('reviewSession').classList.add('hidden');
  document.getElementById('reviewSummary').classList.remove('hidden');

  const correct = results.filter(r => r.isCorrect).length;
  const wrong = results.length - correct;
  const accuracy = results.length ? Math.round(correct / results.length * 100) : 0;

  document.getElementById('summaryStats').innerHTML =
    '<div class="summary-stat"><span class="summary-stat-num">' + results.length + '</span><span class="summary-stat-label">总题数</span></div>' +
    '<div class="summary-stat"><span class="summary-stat-num correct">' + correct + '</span><span class="summary-stat-label">答对</span></div>' +
    '<div class="summary-stat"><span class="summary-stat-num wrong">' + wrong + '</span><span class="summary-stat-label">答错</span></div>' +
    '<div class="summary-stat"><span class="summary-stat-num" style="color:var(--primary);">' + accuracy + '%</span><span class="summary-stat-label">正确率</span></div>';

  // Detail table
  let detailHtml = '<table class="summary-detail-table">';
  detailHtml += '<tr><th>题号</th><th>科目</th><th>题型</th><th>结果</th></tr>';
  session.errors.forEach((e, i) => {
    const ch = Chapters.getById(e.chapterId);
    const qType = e.questionType === 'fillblank' ? '填空' : '选择';
    const res = results[i].isCorrect;
    detailHtml += '<tr><td>Q' + (i + 1) + '</td><td>' + escapeHtml(ch ? ch.name : e.chapterId) + '</td><td>' + qType + '</td><td class="' + (res ? 'correct-cell' : 'wrong-cell') + '">' + (res ? '✓ 正确' : '✗ 错误') + '</td></tr>';
  });
  detailHtml += '</table>';
  document.getElementById('summaryDetail').innerHTML = detailHtml;
}

function quitReviewSession() {
  if (!confirm('确定退出当前考试吗？进度将不会保存。')) return;
  resetReviewUI();
}

// ========================
// Quick Actions
// ========================

function initQuickActions() {
  document.getElementById('btnManualError').addEventListener('click', () => {
    populateChapterSelects();
    openModal('modalErrorEntry');
  });
  document.getElementById('btnBatchImport').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  initWordImport();
}

// ========================
// Global Search
// ========================

function initGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  let debounceTimer;
  input.addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performSearch(e.target.value.trim()), 400);
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') performSearch(input.value.trim()); });
}

async function performSearch(query) {
  if (!query) return;
  const errors = await Errors.list({ search: query });
  const container = document.getElementById('searchResults');
  if (errors.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="ph ph-magnifying-glass"></i><p>未找到相关内容</p></div>';
  } else {
    container.innerHTML = errors.map(e =>
      '<div class="search-result-item" onclick="closeAllModals();openErrorDetailModal(' + e.id + ')">' +
      '<div class="search-result-title">' + escapeHtml(e.title || '未命名') + '</div>' +
      '<div class="search-result-preview">' + escapeHtml((e.question || '').slice(0, 100)) + '...</div>' +
      '<div class="search-result-meta">' + Chapters.getName(e.chapterId) + ' · ' + new Date(e.createdAt).toLocaleDateString('zh-CN') + '</div>' +
      '</div>'
    ).join('');
  }
  openModal('modalSearchResults');
}

// ========================
// Settings
// ========================

async function initSettingsPage() {
  const examDate = await Settings.get('examDate') || getNextAugustExamDate();
  document.getElementById('examDate').value = examDate;

  document.getElementById('btnSaveDate').addEventListener('click', async () => {
    const date = document.getElementById('examDate').value;
    await Settings.set('examDate', date);
    DASHBOARD.setExamDate(date);
    showToast('考试日期已保存', 'success');
    DASHBOARD.refresh();
  });

  document.getElementById('btnExport').addEventListener('click', () => { DataIO.exportAll(); showToast('数据导出中...', 'info'); });

  document.getElementById('importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await DataIO.importAll(await file.text());
      showToast('数据导入成功', 'success');
      if (AppState.currentView === 'library') renderLibrary();
      if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
    } catch (err) { showToast('导入失败: ' + err.message, 'error'); }
    e.target.value = '';
  });

  document.getElementById('btnClearAll').addEventListener('click', async () => {
    if (!confirm('警告：这将清空所有错题和设置！确定继续吗？')) return;
    if (!confirm('再次确认：所有数据将被永久删除，无法恢复。')) return;
    await db.errors.clear();
    await db.reviewHistory.clear();
    await db.settings.clear();
    await initSettings();
    showToast('所有数据已清空', 'warning');
    if (AppState.currentView === 'library') renderLibrary();
    if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
  });
}

// ========================
// Toast
// ========================

function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'ph-check-circle', error: 'ph-x-circle', warning: 'ph-warning', info: 'ph-info' };
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<i class="ph ' + icons[type] + '"></i><span>' + escapeHtml(message) + '</span>';
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ========================
// Library
// ========================

function initLibrary() {
  populateChapterTree();
  document.getElementById('btnSort').addEventListener('click', () => {
    AppState.librarySort = AppState.librarySort === 'time' ? 'chapter' : 'time';
    renderLibrary();
  });
}

async function populateChapterTree() {
  const counts = await Errors.countByChapter();
  const tree = document.getElementById('chapterTree');
  let html = '<div class="chapter-item ' + (!AppState.libraryChapter ? 'active' : '') + '" data-chapter="all">' +
    '<i class="ph ph-books"></i><span>全部错题</span><span class="chapter-count">' + (await db.errors.count()) + '</span></div>';
  CFA_CHAPTERS.forEach(c => {
    const count = counts[c.id] || 0;
    html += '<div class="chapter-item ' + (AppState.libraryChapter === c.id ? 'active' : '') + '" data-chapter="' + c.id + '">' +
      '<i class="ph ph-bookmark"></i><span>' + c.name + '</span><span class="chapter-count">' + count + '</span></div>';
  });
  tree.innerHTML = html;
  tree.querySelectorAll('.chapter-item').forEach(el => {
    el.addEventListener('click', () => {
      AppState.libraryChapter = el.dataset.chapter === 'all' ? null : el.dataset.chapter;
      populateChapterTree();
      renderLibrary();
    });
  });
}

async function renderLibrary() {
  const filters = {};
  if (AppState.libraryChapter) filters.chapterId = AppState.libraryChapter;
  let errors = await Errors.list(filters);

  if (AppState.librarySort === 'chapter') {
    const orderMap = {};
    CFA_CHAPTERS.forEach((c, i) => orderMap[c.id] = i);
    errors.sort((a, b) => (orderMap[a.chapterId] || 0) - (orderMap[b.chapterId] || 0));
  }

  const grid = document.getElementById('cardsGrid');
  const empty = document.getElementById('libraryEmptyState');
  const title = document.getElementById('libraryContentTitle');

  title.textContent = AppState.libraryChapter ? Chapters.getName(AppState.libraryChapter) : '全部错题';

  if (errors.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = errors.map(e => {
    const chapter = Chapters.getById(e.chapterId);
    const qTypeLabel = e.questionType === 'fillblank' ? '填空' : '选择';
    const qTypeClass = e.questionType === 'fillblank' ? 'tag-formula' : 'tag-chapter';
    return `<div class="card" onclick="openErrorDetailModal(${e.id})">
      <div class="card-header-row">
        <div class="card-tags">
          <span class="tag ${qTypeClass}">${qTypeLabel}</span>
          <span class="tag tag-chapter">${chapter ? chapter.code : e.chapterId}</span>
        </div>
      </div>
      <div class="card-title">${escapeHtml(e.title || '未命名')}</div>
      <div class="card-preview">${escapeHtml((e.question || '').slice(0, 120))}...</div>
      <div class="card-footer">
        <span class="card-date">${new Date(e.createdAt).toLocaleDateString('zh-CN')}</span>
        <div class="card-links">
          <span class="card-link"><i class="ph ph-pencil-simple"></i> 编辑</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ========================
// Modals
// ========================

function initModals() {
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeAllModals);
  });
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeAllModals();
  });
  document.getElementById('btnSaveError').addEventListener('click', saveManualError);
  document.getElementById('btnUpdateError').addEventListener('click', saveEditError);
  document.getElementById('btnDeleteError').addEventListener('click', deleteEditError);
  document.getElementById('btnDeleteErrorFromDetail').addEventListener('click', deleteDetailError);
  document.getElementById('btnReviewErrorDetail').addEventListener('click', reviewDetailError);
  document.getElementById('btnEditErrorDetail').addEventListener('click', () => {
    if (AppState.currentDetailId) openErrorEditModal(AppState.currentDetailId);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });
}

function openModal(id) {
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(el => el.classList.add('hidden'));
  document.getElementById('modalOverlay').classList.add('hidden');
}

async function openErrorDetailModal(id) {
  const error = await Errors.get(id);
  if (!error) return;
  AppState.currentDetailId = id;
  const chapter = Chapters.getById(error.chapterId);
  const qTypeLabel = error.questionType === 'fillblank' ? '填空题' : '选择题';

  let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
    '<span class="tag tag-chapter">' + (chapter ? chapter.name : error.chapterId) + '</span>' +
    '<span class="tag tag-formula">' + qTypeLabel + '</span>' +
    '</div>';

  html += '<div class="detail-section"><h4>题目</h4><div class="detail-content">' + formatQuestionContent(error.question || '') + '</div></div>';

  if (error.questionType === 'fillblank') {
    html += '<div class="detail-section"><h4>填空答案</h4><div class="detail-content">' + escapeHtml((error.fillBlanks || []).join(' / ')) + '</div></div>';
  } else if (error.options?.length) {
    html += '<div class="detail-section"><h4>选项</h4><div class="detail-options">';
    error.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const cleanOpt = (opt || '').trim().replace(/^[A-Da-d][\.、\)\:]\s*/, '');
      const isCorrect = error.correctAnswer && (cleanOpt.toUpperCase().startsWith(error.correctAnswer) || letter === error.correctAnswer);
      html += '<div class="detail-option ' + (isCorrect ? 'correct' : '') + '">' + letter + '. ' + escapeHtml(cleanOpt) + '</div>';
    });
    html += '</div></div>';
  }

  html += '<div class="exam-reveal-banner">';
  if (error.correctAnswer) {
    html += '<div class="answer-block correct"><div class="answer-label">正确答案</div><div class="answer-value" style="color:var(--success);">' + escapeHtml((error.correctAnswer || "").toUpperCase()) + '</div></div>';
  }
  if (error.myAnswer) {
    html += '<div class="answer-block wrong"><div class="answer-label">我原来的答案</div><div class="answer-value" style="color:var(--danger);">' + escapeHtml((error.myAnswer || "").toUpperCase()) + '</div></div>';
  }
  html += '</div>';

  if (error.officialExplanation) {
    html += '<div class="detail-section"><h4>官方解析 / 我的备注</h4><div class="detail-content">' + error.officialExplanation + '</div></div>';
  }

  let analysis = {};
  try { analysis = JSON.parse(error.aiExplanation || '{}'); } catch (e) {}
  if (analysis.whyWrong || analysis.correctThinking) {
    html += '<div class="detail-section"><h4><i class="ph ph-sparkle" style="color:var(--accent);"></i> AI 解析</h4>';
    if (analysis.whyWrong) html += '<div style="margin-bottom:10px;"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">错因分析</div><div class="detail-content">' + escapeHtml(analysis.whyWrong) + '</div></div>';
    if (analysis.correctThinking) html += '<div style="margin-bottom:10px;"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">正确思路</div><div class="detail-content">' + escapeHtml(analysis.correctThinking) + '</div></div>';
    html += '</div>';
  }

  document.getElementById('errorDetailBody').innerHTML = html;
  openModal('modalErrorDetail');
}

async function openErrorEditModal(id) {
  const error = await Errors.get(id);
  if (!error) return;
  document.getElementById('editErrorId').value = error.id;
  document.getElementById('editErrorQuestion').value = mergeQuestionAndOptions(error.question, error.options);
  document.getElementById('editErrorFillAnswers').value = (error.fillBlanks || []).join('\n');
  document.getElementById('editErrorMyAnswer').value = (error.myAnswer || '').toUpperCase();
  document.getElementById('editErrorCorrectAnswer').value = (error.correctAnswer || '').toUpperCase();
  document.getElementById('editErrorTags').value = (error.tags || []).join(', ');
  document.getElementById('editErrorType').value = error.questionType || 'choice';

  populateEditChapterSelect();
  document.getElementById('editErrorChapter').value = error.chapterId || 'ethics';

  if (AppState.quillEdit) {
    AppState.quillEdit.root.innerHTML = error.officialExplanation || '';
  }

  toggleEditQuestionTypeFields(error.questionType || 'choice');
  closeAllModals();
  openModal('modalErrorEdit');
}

function populateEditChapterSelect() {
  const el = document.getElementById('editErrorChapter');
  if (el) el.innerHTML = CFA_CHAPTERS.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
}

async function saveEditError() {
  const id = parseInt(document.getElementById('editErrorId').value);
  const qType = document.getElementById('editErrorType').value;
  const rawText = document.getElementById('editErrorQuestion').value.trim();
  const parsed = qType === 'choice' ? parseQuestionAndOptions(rawText) : { question: rawText, options: [] };
  const changes = {
    question: parsed.question,
    questionType: qType,
    chapterId: document.getElementById('editErrorChapter').value,
    myAnswer: document.getElementById('editErrorMyAnswer').value.trim().toUpperCase(),
    tags: document.getElementById('editErrorTags').value.split(',').map(s => s.trim()).filter(Boolean),
    officialExplanation: AppState.quillEdit ? AppState.quillEdit.root.innerHTML : ''
  };
  if (qType === 'choice') {
    changes.options = parsed.options;
    changes.correctAnswer = document.getElementById('editErrorCorrectAnswer').value.trim().toUpperCase();
    changes.fillBlanks = [];
  } else {
    changes.options = [];
    changes.fillBlanks = document.getElementById('editErrorFillAnswers').value.trim().split('\n').filter(Boolean);
    changes.correctAnswer = changes.fillBlanks.join('; ').toUpperCase();
  }
  changes.title = changes.question.slice(0, 40) + (changes.question.length > 40 ? '...' : '');
  await Errors.update(id, changes);
  closeAllModals();
  showToast('错题已更新', 'success');
  if (AppState.currentView === 'library') renderLibrary();
  if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
}

async function deleteEditError() {
  const id = parseInt(document.getElementById('editErrorId').value);
  if (!confirm('确定删除这道错题吗？')) return;
  await Errors.delete(id);
  closeAllModals();
  showToast('错题已删除', 'success');
  if (AppState.currentView === 'library') renderLibrary();
  if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
}

async function deleteDetailError() {
  if (!AppState.currentDetailId) return;
  if (!confirm('确定删除这道错题吗？')) return;
  await Errors.delete(AppState.currentDetailId);
  AppState.currentDetailId = null;
  closeAllModals();
  showToast('错题已删除', 'success');
  if (AppState.currentView === 'library') renderLibrary();
  if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
}

async function reviewDetailError() {
  if (!AppState.currentDetailId) return;
  await Errors.update(AppState.currentDetailId, { reviewCount: (await Errors.get(AppState.currentDetailId)).reviewCount + 1, lastReviewedAt: Date.now() });
  showToast('已标记为已复盘', 'success');
  if (AppState.currentView === 'dashboard') DASHBOARD.refresh();
}
