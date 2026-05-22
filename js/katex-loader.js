/**
 * katex-loader.js - Lädt KaTeX dynamisch und rendert Mathematik
 */

let katexLoaded = false;

/**
 * Lädt KaTeX von CDN (falls nicht vorhanden)
 */
async function loadKaTeX() {
  if (window.katex) return true;
  
  return new Promise((resolve, reject) => {
    // CSS laden
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.css';
    document.head.appendChild(cssLink);
    
    // JS laden
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.js';
    script.onload = () => {
      // Auto-Render für automatische Darstellung
      const autoRender = document.createElement('script');
      autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/contrib/auto-render.min.js';
      autoRender.onload = () => {
        katexLoaded = true;
        resolve(true);
      };
      autoRender.onerror = reject;
      document.head.appendChild(autoRender);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Rendert einen mathematischen Ausdruck
 * @param {string} expression - Mathematischer Ausdruck (LaTeX)
 * @param {boolean} displayMode - Block- oder Inline-Modus
 * @returns {Promise<string>} Gerendertes HTML
 */
export async function renderMath(expression, displayMode = false) {
  try {
    await loadKaTeX();
    
    if (!window.katex) {
      throw new Error('KaTeX konnte nicht geladen werden');
    }
    
    // Temporäres Element für Rendering
    const temp = document.createElement('div');
    window.katex.render(expression, temp, {
      displayMode: displayMode,
      throwOnError: false,
      output: 'html'
    });
    
    return `<div class="math-display ${displayMode ? 'math-block' : 'math-inline'}">${temp.innerHTML}</div>`;
  } catch (error) {
    console.error('Fehler beim Rendern von Mathematik:', error);
    return `<div class="math-error">⚠️ Fehler: ${expression}</div>`;
  }
}

/**
 * Rendert alle mathematischen Ausdrücke auf der Seite (für Auto-Render)
 */
export function renderAllMath() {
  if (window.renderMathInElement) {
    window.renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false
    });
  }
}