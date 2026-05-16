/**
 * CFA L1 Sprint Hub - Formula Management & Bidirectional Linking
 */

const FORMULA_SERVICE = {
  /**
   * Find or create formulas from AI-extracted formula references
   */
  async syncFromError(errorId, formulaRefs) {
    if (!formulaRefs || formulaRefs.length === 0) return;

    const existingFormulas = await Formulas.list();
    const error = await Errors.get(errorId);
    if (!error) return;

    for (const refName of formulaRefs) {
      // Try to find existing formula by name (fuzzy match)
      let matched = existingFormulas.find(f =>
        f.name.toLowerCase().includes(refName.toLowerCase()) ||
        refName.toLowerCase().includes(f.name.toLowerCase())
      );

      if (matched) {
        // Link existing formula to this error
        const relatedErrors = new Set(matched.relatedErrorIds || []);
        relatedErrors.add(errorId);
        await Formulas.update(matched.id, {
          relatedErrorIds: Array.from(relatedErrors)
        });

        // Also link error to formula
        const relatedFormulas = new Set(error.relatedFormulaIds || []);
        relatedFormulas.add(matched.id);
        await Errors.update(errorId, {
          relatedFormulaIds: Array.from(relatedFormulas)
        });
      }
      // If not matched, we don't auto-create to avoid duplicates
      // User can manually create or AI extraction from PDF will handle it
    }
  },

  /**
   * Link an error to a specific formula
   */
  async linkErrorToFormula(errorId, formulaId) {
    const error = await Errors.get(errorId);
    const formula = await Formulas.get(formulaId);
    if (!error || !formula) return;

    const errorFormulas = new Set(error.relatedFormulaIds || []);
    errorFormulas.add(formulaId);
    await Errors.update(errorId, { relatedFormulaIds: Array.from(errorFormulas) });

    const formulaErrors = new Set(formula.relatedErrorIds || []);
    formulaErrors.add(errorId);
    await Formulas.update(formulaId, { relatedErrorIds: Array.from(formulaErrors) });
  },

  /**
   * Unlink error and formula
   */
  async unlinkErrorFromFormula(errorId, formulaId) {
    const error = await Errors.get(errorId);
    const formula = await Formulas.get(formulaId);
    if (!error || !formula) return;

    await Errors.update(errorId, {
      relatedFormulaIds: (error.relatedFormulaIds || []).filter(id => id !== formulaId)
    });

    await Formulas.update(formulaId, {
      relatedErrorIds: (formula.relatedErrorIds || []).filter(id => id !== errorId)
    });
  },

  /**
   * Render LaTeX formula using KaTeX
   */
  renderLatex(element, latex, options = {}) {
    if (!window.katex) return;
    try {
      katex.render(latex, element, {
        throwOnError: false,
        displayMode: options.displayMode ?? true,
        ...options
      });
    } catch (e) {
      element.textContent = latex;
      console.warn('[KaTeX] Render failed:', e);
    }
  },

  /**
   * Auto-render all math in a container
   */
  autoRender(container) {
    if (!window.renderMathInElement) return;
    try {
      renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn('[KaTeX] Auto-render failed:', e);
    }
  }
};
