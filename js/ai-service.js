/**
 * CFA L1 Sprint Hub - AI Service Layer
 * Supports OpenAI-compatible APIs (OpenAI, DeepSeek, custom)
 * All API calls are made directly from the browser with user-provided key
 */

const AI_SERVICE = {
  abortController: null,

  async getConfig() {
    const apiType = await Settings.get('apiType') || 'openai';
    const apiKey = await Settings.get('apiKey') || '';
    let apiUrl = await Settings.get('apiUrl') || '';
    let apiModel = await Settings.get('apiModel') || '';

    if (!apiUrl) {
      if (apiType === 'openai') apiUrl = 'https://api.openai.com/v1/chat/completions';
      else if (apiType === 'deepseek') apiUrl = 'https://api.deepseek.com/v1/chat/completions';
      else if (apiType === 'kimi') apiUrl = 'https://api.moonshot.cn/v1/chat/completions';
    }
    if (!apiModel) {
      if (apiType === 'openai') apiModel = 'gpt-4o-mini';
      else if (apiType === 'deepseek') apiModel = 'deepseek-chat';
      else if (apiType === 'kimi') apiModel = 'moonshot-v1-8k';
    }

    return { apiType, apiKey, apiUrl, apiModel };
  },

  isConfigured() {
    return this.getConfig().then(c => !!c.apiKey);
  },

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  },

  async callLLM(messages, options = {}) {
    const config = await this.getConfig();
    if (!config.apiKey) {
      throw new Error('API Key 未配置，请先在设置中配置 AI 接口');
    }

    this.abortController = new AbortController();
    const { onStream } = options;

    const body = {
      model: config.apiModel,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
      stream: !!onStream
    };

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${err}`);
    }

    if (onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line === 'data: [DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta?.content || '';
              fullText += delta;
              onStream(delta, fullText);
            } catch (e) { /* ignore parse error */ }
          }
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  },

  // ========================
  // Error Analysis Skill
  // ========================

  buildErrorParsePrompt(ocrText, officialExplanation = '') {
    return [
      {
        role: 'system',
        content: `你是 CFA Level 1 专业备考助手。你的任务是解析考生上传的错题，并生成结构化解析。

## 核心约束（必须严格遵守）
1. **仅基于原题内容和提供的官方解析进行讲解，绝对不要编造任何内容**
2. 如果官方解析为空或不确定，明确标注"官方解析未提供"
3. 所有知识点必须与 CFA Level 1 考纲对应

## 输出格式（严格JSON）
{
  "title": "题目核心考点的一句话标题",
  "question": "整理后的题目内容",
  "options": ["A. ...", "B. ...", "C. ..."],
  "myAnswer": "考生的错误答案（从题干推断）",
  "correctAnswer": "正确答案",
  "keyPoints": ["考点1", "考点2"],
  "formulaRefs": ["相关公式名称1", "相关公式名称2"],
  "analysis": {
    "whyWrong": "为什么选错了——中文直白讲解",
    "correctThinking": "正确思路是什么",
    "trapAnalysis": "这道题的陷阱/易错点在哪里",
    "memoryTip": "一句话记忆技巧"
  },
  "chapterGuess": "最可能所属的章节ID，从以下选择：ethics/quant/econ/fsa/corporate/equity/fixed/derivatives/alt/portfolio"
}

## 注意
- 如果 OCR 文本混乱，尽力还原题目结构
- 选项要完整保留
- 公式名称用中文，例如"持有期收益率"、"净现值公式"
- 必须返回合法JSON，不要包含markdown代码块标记`
      },
      {
        role: 'user',
        content: `【OCR识别的题目内容】\n${ocrText}\n\n【官方解析/考生备注】\n${officialExplanation || '（未提供）'}`
      }
    ];
  },

  async parseError(ocrText, officialExplanation = '', onProgress) {
    if (onProgress) onProgress('正在调用 AI 解析错题...', 30);
    const messages = this.buildErrorParsePrompt(ocrText, officialExplanation);
    const raw = await this.callLLM(messages, { temperature: 0.2 });
    if (onProgress) onProgress('解析完成，正在结构化...', 80);

    // Extract JSON
    let jsonStr = raw.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    try {
      const result = JSON.parse(jsonStr);
      if (onProgress) onProgress('解析成功', 100);
      return result;
    } catch (e) {
      // Fallback: wrap raw text
      console.warn('[AI] JSON parse failed, using raw text fallback', e);
      return {
        title: '错题解析',
        question: ocrText,
        options: [],
        myAnswer: '',
        correctAnswer: '',
        keyPoints: [],
        formulaRefs: [],
        analysis: {
          whyWrong: raw,
          correctThinking: '',
          trapAnalysis: '',
          memoryTip: ''
        },
        chapterGuess: 'ethics'
      };
    }
  },

  // ========================
  // Formula Extraction Skill
  // ========================

  buildFormulaExtractPrompt(text) {
    return [
      {
        role: 'system',
        content: `你是 CFA Level 1 公式提取专家。从给定的讲义或题目文本中提取所有金融公式。

## 输出格式（严格JSON数组）
[
  {
    "name": "公式中文名称",
    "latex": "LaTeX格式的公式，如 \\\\frac{P_1 - P_0 + D_1}{P_0}",
    "variables": "变量说明，如 P0=期初价格, P1=期末价格",
    "usage": "一句话使用场景",
    "chapterGuess": "所属章节ID：ethics/quant/econ/fsa/corporate/equity/fixed/derivatives/alt/portfolio"
  }
]

## 约束
- 仅提取 CFA Level 1 范围内的金融/会计/统计公式
- 不要编造公式，文本中没有就不输出
- 必须返回合法JSON数组，不要包含markdown代码块`
      },
      {
        role: 'user',
        content: `【待提取文本】\n${text.slice(0, 8000)}`
      }
    ];
  },

  async extractFormulas(text, onProgress) {
    if (onProgress) onProgress('正在提取公式...', 40);
    const messages = this.buildFormulaExtractPrompt(text);
    const raw = await this.callLLM(messages, { temperature: 0.1 });
    if (onProgress) onProgress('公式提取完成', 90);

    let jsonStr = raw.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    try {
      const result = JSON.parse(jsonStr);
      if (onProgress) onProgress('公式结构化完成', 100);
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.warn('[AI] Formula JSON parse failed', e);
      return [];
    }
  },

  // ========================
  // Daily Review Advice Skill
  // ========================

  async generateDailyReview(errors, formulas, daysLeft, onProgress) {
    const errorSummary = errors.slice(0, 10).map(e =>
      `- ${e.title || ''} (${Chapters.getName(e.chapterId)})`
    ).join('\n');

    const formulaSummary = formulas.slice(0, 10).map(f =>
      `- ${f.name}`
    ).join('\n');

    const messages = [
      {
        role: 'system',
        content: `你是 CFA Level 1 备考规划师。根据考生的错题和公式数据，生成今日的个性化复习建议。

## 输出格式（严格JSON）
{
  "focusAreas": ["建议重点复习的章节/知识点"],
  "tasks": [
    {"type": "error|formula|chapter", "title": "任务标题", "desc": "具体做什么", "targetId": "相关错题或公式ID"}
  ],
  "message": "一句鼓励的话"
}

## 阶段策略
- 考前2个月以上：全面积累，重点攻克错题最多的章节
- 考前1-2个月：复盘高频错题、易混知识点、反复做错的公式
- 考前1个月内：只看最薄弱点，不刷新题
- 考前1周：只复盘个人最易遗忘的公式+典型错题

必须返回合法JSON，不要包含markdown代码块。`
      },
      {
        role: 'user',
        content: `距离考试还有 ${daysLeft} 天。

【近期错题】\n${errorSummary || '暂无错题'}

【已收录公式】\n${formulaSummary || '暂无公式'}

请生成今日复习建议。`
      }
    ];

    if (onProgress) onProgress('正在生成复习策略...', 50);
    const raw = await this.callLLM(messages, { temperature: 0.4, maxTokens: 2048 });

    let jsonStr = raw.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return {
        focusAreas: ['继续积累错题和公式'],
        tasks: [],
        message: '保持节奏，持续进步！'
      };
    }
  },

  // ========================
  // Mock/Demo Mode
  // ========================

  async mockParseError(ocrText) {
    await delay(1500);
    return {
      title: 'Demo 解析结果（请配置 API Key 获取真实解析）',
      question: ocrText.slice(0, 200) + (ocrText.length > 200 ? '...' : ''),
      options: ['A. Option 1', 'B. Option 2', 'C. Option 3'],
      myAnswer: 'A',
      correctAnswer: 'B',
      keyPoints: ['考点示例 - 请配置 API Key'],
      formulaRefs: ['示例公式'],
      analysis: {
        whyWrong: '这是演示模式。请在「设置」中配置您的 OpenAI / DeepSeek API Key，即可获得基于真实大模型的专业解析。',
        correctThinking: '配置 API Key 后，AI 将根据原题和官方解析为您生成精准的错因分析。',
        trapAnalysis: '未配置 API Key 时，系统仅展示演示数据。',
        memoryTip: '点击左侧「设置」→ 填写 API Key → 保存。'
      },
      chapterGuess: 'quant'
    };
  },

  async mockExtractFormulas() {
    await delay(1000);
    return [];
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
