/**
 * CFA L1 Sprint Hub - PDF Handler
 * Uses PDF.js for text extraction and image-based PDF OCR
 */

const PDF_SERVICE = {
  /**
   * Process a PDF file: extract text if available, otherwise OCR each page
   */
  async processPDF(file, onProgress) {
    let pdf = null;
    try {
      if (onProgress) onProgress(2, '正在读取 PDF 文件...');
      const arrayBuffer = await file.arrayBuffer();

      if (onProgress) onProgress(5, '正在加载 PDF 解析器...');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      if (onProgress) onProgress(8, `PDF 共 ${totalPages} 页，正在分析内容类型...`);

      const results = [];
      let hasSignificantText = false;

      // First pass: try text extraction on first page to determine PDF type
      try {
        const firstPage = await pdf.getPage(1);
        const textContent = await firstPage.getTextContent();
        const firstPageText = textContent.items.map(i => i.str).join(' ').trim();

        if (firstPageText.length > 50) {
          hasSignificantText = true;
          if (onProgress) onProgress(10, '检测到文字型 PDF，正在提取文本...');
        } else {
          if (onProgress) onProgress(10, '检测到图片型 PDF，将逐页 OCR 识别...');
        }
      } catch (e) {
        if (onProgress) onProgress(10, 'PDF 首页分析失败，将尝试逐页 OCR...');
      }

      if (hasSignificantText) {
        // Text-based PDF: extract text from all pages
        for (let i = 1; i <= totalPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            const pageText = tc.items.map(item => item.str).join(' ');
            results.push({ page: i, text: pageText, type: 'text' });
            if (onProgress) onProgress(Math.round(10 + (i / totalPages) * 40), `正在提取第 ${i}/${totalPages} 页文字...`);
          } catch (pageErr) {
            results.push({ page: i, text: `[第 ${i} 页提取失败: ${pageErr.message}]`, type: 'error' });
          }
        }
      } else {
        // Image-based PDF: render each page and OCR
        for (let i = 1; i <= totalPages; i++) {
          try {
            if (onProgress) onProgress(Math.round(10 + ((i - 1) / totalPages) * 40), `正在处理第 ${i}/${totalPages} 页...`);

            const page = await pdf.getPage(i);
            const scale = 2.0; // Higher scale for better OCR
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: ctx, viewport }).promise;

            // OCR the page image
            const imageData = canvas.toDataURL('image/png');
            let ocrResult;
            try {
              ocrResult = await OCR_SERVICE.recognize(imageData, pct => {
                if (onProgress) {
                  const base = 10 + ((i - 1) / totalPages) * 40;
                  const pageProgress = (pct / 100) * (40 / totalPages);
                  onProgress(Math.round(base + pageProgress), `正在识别第 ${i}/${totalPages} 页...`);
                }
              });
            } catch (e) {
              ocrResult = { text: `[第 ${i} 页 OCR 失败: ${e.message}]`, confidence: 0 };
            }

            results.push({
              page: i,
              text: ocrResult.text,
              confidence: ocrResult.confidence,
              type: 'ocr'
            });
          } catch (pageErr) {
            results.push({ page: i, text: `[第 ${i} 页处理失败: ${pageErr.message}]`, type: 'error' });
          }
        }
      }

      if (onProgress) onProgress(55, 'PDF 处理完成，准备 AI 解析...');

      // Combine all pages
      const fullText = results.map(r => `--- Page ${r.page} ---\n${r.text}`).join('\n\n');

      return {
        filename: file.name,
        totalPages,
        hasSignificantText,
        pages: results,
        fullText,
        isImagePDF: !hasSignificantText
      };
    } catch (err) {
      throw new Error('PDF 解析失败: ' + (err.message || '未知错误'));
    }
  }
};
