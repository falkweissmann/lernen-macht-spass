/**
 * contentRegistry.js - Registry für dynamische Content-Renderer
 * Ermöglicht einfaches Hinzufügen neuer Inhaltstypen
 */

// Registry: Speichert alle Renderer-Funktionen
const ContentRenderers = new Map();

/**
 * Registriert einen neuen Inhaltstyp
 * @param {string} type - Name des Inhaltstyps (z.B. 'video', 'math')
 * @param {Function} renderer - Funktion die den Content rendert
 */
export function registerContentType(type, renderer) {
  if (ContentRenderers.has(type)) {
    console.warn(`⚠️ Content-Typ '${type}' wird überschrieben`);
  }
  ContentRenderers.set(type, renderer);
  console.log(`✅ Content-Typ '${type}' registriert`);
}

/**
 * Rendert einen Content-Block basierend auf seinem Typ
 * @param {Object} contentBlock - Content-Block aus JSON
 * @returns {string|HTMLElement} Gerendertes HTML
 */
export function renderContent(contentBlock) {
  const { type } = contentBlock;
  
  if (!type) {
    console.error('Content-Block hat keinen Typ:', contentBlock);
    return '<div class="error">Fehler: Content-Typ fehlt</div>';
  }
  
  const renderer = ContentRenderers.get(type);
  
  if (!renderer) {
    console.warn(`Unbekannter Content-Typ: ${type}`);
    return `<div class="error">⚠️ Unbekannter Inhaltstyp: ${type}</div>`;
  }
  
  try {
    return renderer(contentBlock);
  } catch (error) {
    console.error(`Fehler beim Rendern von Typ '${type}':`, error);
    return `<div class="error">Fehler beim Laden von ${type}</div>`;
  }
}

/**
 * Rendert ein Array von Content-Blöcken
 * @param {Array} contentArray - Array von Content-Blöcken
 * @returns {string} Zusammengefügtes HTML
 */
export function renderContentArray(contentArray) {
  if (!contentArray || !Array.isArray(contentArray)) {
    return '<div class="error">Kein Inhalt vorhanden</div>';
  }
  
  return contentArray.map(block => renderContent(block)).join('');
}

/**
 * Registriert die Standard-Content-Typen
 */
export function registerDefaultContentTypes() {
  // Text
  registerContentType('text', (block) => {
    return `<div class="content-text">${block.content || ''}</div>`;
  });
  
  // Bild
  registerContentType('image', (block) => {
    return `
      <div class="content-image">
        <img src="${block.url || ''}" alt="${block.alt || ''}" loading="lazy">
        ${block.caption ? `<p class="caption">${block.caption}</p>` : ''}
      </div>
    `;
  });
  
  // Video
  registerContentType('video', (block) => {
    const isYouTube = block.url?.includes('youtube.com') || block.url?.includes('youtu.be');
    
    if (isYouTube) {
      // YouTube Embed
      let videoId = block.url.split('v=')[1];
      if (!videoId) videoId = block.url.split('/').pop();
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      return `
        <div class="content-video">
          <div class="video-container">
            <iframe 
              src="${embedUrl}" 
              title="${block.title || 'Video'}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
          ${block.caption ? `<p class="caption">${block.caption}</p>` : ''}
        </div>
      `;
    } else {
      // Lokales Video
      return `
        <div class="content-video">
          <div class="video-container">
            <video controls preload="metadata">
              <source src="${block.url}" type="video/mp4">
              Dein Browser unterstützt kein HTML5-Video.
            </video>
          </div>
          ${block.caption ? `<p class="caption">${block.caption}</p>` : ''}
        </div>
      `;
    }
  });
  
  // Audio
  registerContentType('audio', (block) => {
    return `
      <div class="content-audio">
        <audio controls>
          <source src="${block.url}" type="audio/mpeg">
          Dein Browser unterstützt kein Audio-Element.
        </audio>
        ${block.title ? `<p>${block.title}</p>` : ''}
      </div>
    `;
  });
  
  // PDF
  registerContentType('pdf', (block) => {
    return `
      <div class="content-pdf">
        <a href="${block.url}" target="_blank" class="pdf-link" rel="noopener noreferrer">
          📄 ${block.title || 'PDF öffnen'}
        </a>
        <iframe 
          src="${block.url}" 
          title="${block.title || 'PDF-Dokument'}"
          class="pdf-embed"
          loading="lazy">
        </iframe>
      </div>
    `;
  });
  
  // Mathematik (KaTeX)
  registerContentType('math', async (block) => {
    // Asynchroner Renderer, da KaTeX geladen werden muss
    const { renderMath } = await import('./katex-loader.js');
    return renderMath(block.content, block.displayMode || false);
  });
  
  // GeoGebra
  registerContentType('geogebra', (block) => {
    const appletId = block.appletId;
    const width = block.width || 800;
    const height = block.height || 600;
    const settings = block.settings || {};
    
    return `
      <div class="content-geogebra">
        <div id="ggb-${appletId}" class="geogebra-container" style="width:${width}px; height:${height}px"></div>
        <script>
          // GeoGebra wird später per JavaScript geladen
          window.geogebraApps = window.geogebraApps || [];
          window.geogebraApps.push({
            id: 'ggb-${appletId}',
            appletId: '${appletId}',
            settings: ${JSON.stringify(settings)}
          });
        </script>
      </div>
    `;
  });
  
  // Hinweise
  registerContentType('hint', (block) => {
    return `
      <div class="content-hint">
        <div class="hint-title">${block.title || '💡 Tipp'}</div>
        <div class="hint-content">${block.content || ''}</div>
      </div>
    `;
  });
  
  // Spoiler (aufklappbar)
  registerContentType('spoiler', (block) => {
    const id = `spoiler-${Date.now()}-${Math.random()}`;
    return `
      <div class="content-spoiler">
        <details>
          <summary>${block.title || '🔒 Lösung anzeigen'}</summary>
          <div class="spoiler-content">
            ${block.content || ''}
          </div>
        </details>
      </div>
    `;
  });
  
  // Trennlinie
  registerContentType('separator', () => {
    return '<hr class="content-separator">';
  });
  
  // Zitat
  registerContentType('quote', (block) => {
    return `
      <div class="content-quote">
        <blockquote>
          <p>${block.content || ''}</p>
          ${block.author ? `<footer>— ${block.author}</footer>` : ''}
        </blockquote>
      </div>
    `;
  });
  
  // Code-Block
  registerContentType('code', (block) => {
    return `
      <div class="content-code">
        <pre><code class="language-${block.language || 'plaintext'}">${escapeHtml(block.content || '')}</code></pre>
      </div>
    `;
  });
}

// Hilfsfunktion: HTML escaping
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}