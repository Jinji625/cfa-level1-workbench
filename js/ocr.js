/**
 * CFA L1 Sprint Hub - OCR Service
 * Uses Tesseract.js with 30s timeout fallback
 */

const OCR_SERVICE = {
  worker: null,
  isInitializing: false,
  initError: null,

  async init(onProgress) {
    if (this.worker) return;
    if (this.isInitializing) {
      while (this.isInitializing) await new Promise(r => setTimeout(r, 200));
      if (this.worker) return;
      if (this.initError) throw this.initError;
    }

    this.isInitializing = true;
    this.initError = null;

    try {
      if (onProgress) onProgress({ status: 'init', progress: 0, message: '首次使用需下载 OCR 引擎（约 4MB，请等待 10-30 秒）...' });

      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (onProgress) {
            let message = m.status;
            if (m.status === 'loading language traineddata') message = '正在下载语言包...';
            else if (m.status === 'initializing api') message = '正在初始化引擎...';
            else if (m.status === 'recognizing text') message = '正在识别文字...';
            onProgress({ status: m.status, progress: Math.round(m.progress * 100), message });
          }
        }
      });

      if (onProgress) onProgress({ status: 'ready', progress: 100, message: 'OCR 就绪' });
    } catch (e) {
      this.initError = e;
      throw new Error('OCR 初始化失败：' + (e.message || '网络问题，请刷新重试'));
    } finally {
      this.isInitializing = false;
    }
  },

  async ensureWorker(onProgress) {
    if (!this.worker) await this.init(onProgress);
    return this.worker;
  },

  async recognize(imageSource, onProgress) {
    const worker = await this.ensureWorker(onProgress
      ? p => { if (p.status === 'recognizing text') onProgress(p.progress); }
      : null
    );
    if (!worker) throw new Error('OCR 不可用');

    const result = await worker.recognize(imageSource, {}, {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
      }
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words
    };
  },

  async recognizeWithTimeout(imageSource, onProgress, timeoutMs = 30000) {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`OCR 识别超时（${timeoutMs / 1000}秒），可能是网络较慢。已保存图片，您可手动补充文字。`));
      }, timeoutMs);

      try {
        const result = await this.recognize(imageSource, onProgress);
        clearTimeout(timer);
        resolve(result);
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    });
  },

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
