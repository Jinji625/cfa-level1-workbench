/**
 * CFA L1 Sprint Hub - Database Layer (错题专用版)
 */

const DB_NAME = 'CFAL1ErrorHub';
const DB_VERSION = 3;

const CFA_CHAPTERS = [
  { id: 'ethics', code: 'Ethics', name: '道德与职业标准', fullName: 'Ethical and Professional Standards', order: 1 },
  { id: 'quant', code: 'Quant', name: '定量方法', fullName: 'Quantitative Methods', order: 2 },
  { id: 'econ', code: 'Econ', name: '经济学', fullName: 'Economics', order: 3 },
  { id: 'fsa', code: 'FSA', name: '财务报表分析', fullName: 'Financial Statement Analysis', order: 4 },
  { id: 'corporate', code: 'Corp', name: '公司发行人', fullName: 'Corporate Issuers', order: 5 },
  { id: 'equity', code: 'Equity', name: '权益投资', fullName: 'Equity Investments', order: 6 },
  { id: 'fixed', code: 'Fixed', name: '固定收益', fullName: 'Fixed Income', order: 7 },
  { id: 'derivatives', code: 'Deriv', name: '衍生品', fullName: 'Derivatives', order: 8 },
  { id: 'alt', code: 'Alt', name: '另类投资', fullName: 'Alternative Investments', order: 9 },
  { id: 'portfolio', code: 'PM', name: '投资组合管理', fullName: 'Portfolio Management', order: 10 }
];

const db = new Dexie(DB_NAME);

db.version(DB_VERSION).stores({
  errors: '++id, chapterId, createdAt, updatedAt, title, *tags, questionType',
  settings: 'key',
  reviewHistory: '++id, errorId, reviewedAt, isCorrect'
});

async function initSettings() {
  const defaults = [
    { key: 'examDate', value: getNextAugustExamDate() },
    { key: 'apiType', value: 'openai' },
    { key: 'apiKey', value: '' },
    { key: 'apiUrl', value: '' },
    { key: 'apiModel', value: 'gpt-4o-mini' }
  ];
  for (const s of defaults) {
    const exists = await db.settings.get(s.key);
    if (!exists) await db.settings.put(s);
  }
}

function getNextAugustExamDate() {
  const now = new Date();
  const year = now.getMonth() > 7 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-08-16`;
}

const Settings = {
  async get(key) {
    const s = await db.settings.get(key);
    return s ? s.value : null;
  },
  async set(key, value) {
    await db.settings.put({ key, value });
  }
};

const Errors = {
  async add(data) {
    const now = Date.now();
    const record = {
      chapterId: data.chapterId || 'ethics',
      title: data.title || '',
      question: data.question || '',
      options: data.options || [],
      myAnswer: data.myAnswer || '',
      correctAnswer: data.correctAnswer || '',
      questionType: data.questionType || 'choice',
      officialExplanation: data.officialExplanation || '',
      aiExplanation: data.aiExplanation || '',
      keyPoints: data.keyPoints || [],
      tags: data.tags || [],
      fillBlanks: data.fillBlanks || [],
      sourceImage: data.sourceImage || null,
      sourceFile: data.sourceFile || null,
      createdAt: now,
      updatedAt: now,
      reviewCount: 0,
      lastReviewedAt: null
    };
    return await db.errors.add(record);
  },

  async update(id, changes) {
    changes.updatedAt = Date.now();
    await db.errors.update(id, changes);
  },

  async delete(id) {
    await db.errors.delete(id);
    await db.reviewHistory.where('errorId').equals(id).delete();
  },

  async get(id) {
    return await db.errors.get(id);
  },

  async list(filters = {}) {
    let collection = db.errors.orderBy('createdAt').reverse();
    if (filters.chapterId) {
      collection = db.errors.where('chapterId').equals(filters.chapterId).reverse();
    }
    const items = await collection.toArray();
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return items.filter(i =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.question && i.question.toLowerCase().includes(q)) ||
        (i.officialExplanation && i.officialExplanation.toLowerCase().includes(q)) ||
        (i.aiExplanation && i.aiExplanation.toLowerCase().includes(q)) ||
        (i.keyPoints && i.keyPoints.some(k => k.toLowerCase().includes(q)))
      );
    }
    return items;
  },

  async countByChapter() {
    const all = await db.errors.toArray();
    const map = {};
    for (const e of all) map[e.chapterId] = (map[e.chapterId] || 0) + 1;
    return map;
  },

  async getWeeklyNew() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return await db.errors.where('createdAt').above(weekAgo).count();
  },

  async getTotalReviewed() {
    return await db.errors.where('reviewCount').above(0).count();
  }
};

const ReviewHistory = {
  async add(errorId, isCorrect) {
    return await db.reviewHistory.add({
      errorId,
      isCorrect,
      reviewedAt: Date.now()
    });
  },

  async getStats() {
    const all = await db.reviewHistory.toArray();
    const total = all.length;
    const correct = all.filter(r => r.isCorrect).length;
    return { total, correct, wrong: total - correct, accuracy: total ? Math.round((correct / total) * 100) : 0 };
  }
};

const DataIO = {
  async exportAll() {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      errors: await db.errors.toArray(),
      settings: await db.settings.toArray()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cfa-l1-errors-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importAll(jsonText) {
    const data = JSON.parse(jsonText);
    if (data.errors) {
      await db.errors.clear();
      await db.errors.bulkAdd(data.errors);
    }
    if (data.settings) {
      for (const s of data.settings) await db.settings.put(s);
    }
  }
};

async function initDatabase() {
  await db.open();
  await initSettings();
  console.log('[DB] Database initialized');
}

const Chapters = {
  getAll() { return CFA_CHAPTERS; },
  getById(id) { return CFA_CHAPTERS.find(c => c.id === id); },
  getName(id) {
    const c = this.getById(id);
    return c ? c.name : id;
  }
};
