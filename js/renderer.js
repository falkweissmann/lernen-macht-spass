/**
 * renderer.js - Dynamisches Rendern aller Komponenten
 */

/**
 * Rendert die Kacheln für Klassenstufen
 */
export function renderGradeTiles(subjects, containerId, onTileClick) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} nicht gefunden`);
    return;
  }
  
  if (!subjects || subjects.length === 0) {
    container.innerHTML = '<div class="error">Keine Klassenstufen gefunden</div>';
    return;
  }
  
  // Nur aktive Klassen anzeigen
  const activeSubjects = subjects.filter(s => s.active !== false);
  
  const tilesHTML = activeSubjects.map(subject => `
    <div class="tile grade-tile" data-subject-id="${subject.id}" data-grade="${subject.grade}">
      <div class="tile-icon" style="background: ${subject.color || '#3b82f6'}20">
        <span class="icon-large">${subject.icon || '📚'}</span>
      </div>
      <h3 class="tile-title">${subject.name || 'Klasse ' + subject.grade}</h3>
      <p class="tile-description">Mathematik Klasse ${subject.grade || ''}</p>
      <div class="tile-footer">
        <span class="topic-count">📚 Themen</span>
        <span class="arrow">→</span>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = `<div class="tile-grid">${tilesHTML}</div>`;
  
  // Event Delegation für Klicks
  container.querySelectorAll('.grade-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const subjectId = tile.dataset.subjectId;
      if (onTileClick && typeof onTileClick === 'function') {
        onTileClick(subjectId);
      }
    });
  });
}

/**
 * Rendert die Themen-Kacheln für eine ausgewählte Klasse
 */
export function renderTopicTiles(topics, subjectId, containerId, onTopicClick, progressData = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} nicht gefunden`);
    return;
  }
  
  if (!topics || topics.length === 0) {
    container.innerHTML = '<div class="error">Keine Themen gefunden</div>';
    return;
  }
  
  // Filtere Themen nach Klassenstufe
  const gradeTopics = topics.filter(t => t.subjectId === subjectId && t.active !== false);
  
  // Sortiere nach order
  gradeTopics.sort((a, b) => (a.order || 0) - (b.order || 0));
  
  if (gradeTopics.length === 0) {
    container.innerHTML = `<div class="empty-state">📭 Keine Themen für diese Klasse verfügbar</div>`;
    return;
  }
  
  const topicsHTML = gradeTopics.map(topic => {
    const progress = progressData[topic.id] || { completed: false, score: 0 };
    const completedClass = progress.completed ? 'completed' : '';
    
    return `
      <div class="tile topic-tile ${completedClass}" data-topic-id="${topic.id}">
        <div class="tile-header">
          <span class="tile-icon-small">${topic.icon || '📚'}</span>
          <span class="difficulty-badge difficulty-${topic.difficulty || 1}">
            ${'⭐'.repeat(topic.difficulty || 1)}
          </span>
        </div>
        <h3 class="tile-title">${topic.title || 'Thema'}</h3>
        <p class="tile-description">${topic.description || 'Keine Beschreibung'}</p>
        <div class="topic-meta">
          <span class="duration">⏱️ ${topic.duration || 30} min</span>
          <span class="content-types">${(topic.contentTypes || ['text']).map(ct => getContentTypeIcon(ct)).join(' ')}</span>
        </div>
        ${progress.completed ? `
          <div class="completion-badge">
            ✅ Abgeschlossen (${progress.score}%)
          </div>
        ` : `
          <button class="btn-start">Starten →</button>
        `}
      </div>
    `;
  }).join('');
  
  container.innerHTML = `<div class="tile-grid topics-grid">${topicsHTML}</div>`;
  
  // Event-Listener für Start-Buttons
  container.querySelectorAll('.topic-tile').forEach(tile => {
    const startBtn = tile.querySelector('.btn-start');
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const topicId = tile.dataset.topicId;
        if (onTopicClick && typeof onTopicClick === 'function') {
          onTopicClick(topicId);
        }
      });
    }
    
    // Falls auf die ganze Kachel geklickt wird (optional)
    tile.addEventListener('click', (e) => {
      if (!e.target.classList || !e.target.classList.contains('btn-start')) {
        const topicId = tile.dataset.topicId;
        if (onTopicClick && typeof onTopicClick === 'function' && !progressData[topicId]?.completed) {
          onTopicClick(topicId);
        }
      }
    });
  });
}

/**
 * Hilfsfunktion: Icon für Content-Typ
 */
function getContentTypeIcon(type) {
  const icons = {
    text: '📝',
    video: '🎥',
    quiz: '❓',
    interactive: '🎮',
    canvas: '✏️',
    diagram: '📊',
    geogebra: '📐'
  };
  return icons[type] || '📚';
}

/**
 * Rendert Fortschrittsbalken
 */
export function renderProgressBar(percentage, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const percent = Math.min(100, Math.max(0, percentage || 0));
  
  container.innerHTML = `
    <div class="progress-container">
      <div class="progress-bar" style="width: ${percent}%">
        <span class="progress-text">${Math.round(percent)}%</span>
      </div>
    </div>
  `;
}

/**
 * Zeigt Ladezustand an
 */
export function showLoading(containerId, message = 'Lade Inhalte...') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="loading-spinner">${message}</div>`;
  }
}

/**
 * Zeigt Fehlermeldung an
 */
export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
  }
}