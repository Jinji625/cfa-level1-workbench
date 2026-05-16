/**
 * CFA L1 Sprint Hub - Main Application Logic
 */

const AppState = {
  currentView: 'upload',
  libraryChapter: null,
  librarySort: 'time',
  currentDetailId: null,
  quillNew: null,
  quillEdit: null,
  reviewSession: null
};

document.addEventListener('DOMContentLoaded', async () => {
  await initDatabase();
  initRouter();
  initLibrary();
  initReviewMode();
  initSettingsPage();
  initModals();
  initGlobalSearch();
  initQuickActions();
  initQuillEditors();
  initQuestionTypeToggle();
  navigateTo(location.hash.slice(1) || 'upload');
  DASHBOARD.updateCountdown();
  setInterval(() => DASHBOARD.updateCountdown(), 60000);
  console.log('[App] CFA L1 Error Hub initialized');
});

function initRouter() {
  window.addEventListener('hashchange', () => navigateTo(location.hash.slice(1) || 'upload'));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); location.hash = el.dataset.view; });
  });
}

function navigateTo(view) {
  const validViews = ['upload', 'library', 'review', 'dashboard', 'settings'];
  if (!validViews.includes(view)) view = 'upload';
  AppState.currentView = view;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  const titles = { upload: '录入错题', library: '错题库', review: '模拟考试', dashboard: '学习面板', settings: '设置' };
  document.getElementById('pageTitle').textContent = titles[view];
  if (view === 'library') renderLibrary();
  if (view === 'dashboard') DASHBOARD.refresh();
  if (view === 'review') resetReviewUI();
}

function initQuillEditors() {
  const toolbar = [['bold','italic','underline','strike'],[{'header':1},{'header':2}],[{'list':'ordered'},{'list':'bullet'}],['blockquote','code-block'],[{'color':[]},{'background':[]}],['link','image'],['table'],['clean']];
  if (document.getElementById('quillEditorNew')) {
    AppState.quillNew = new Quill('#quillEditorNew', { theme: 'snow', placeholder: '在此输入官方解析、错因分析、记忆技巧...', modules: { toolbar } });
  }
  if (document.getElementById('quillEditorEdit')) {
    AppState.quillEdit = new Quill('#quillEditorEdit', { theme: 'snow', placeholder: '编辑解析内容...', modules: { toolbar } });
  }
}

