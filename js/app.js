/**
 * app.js - Hauptanwendungslogik
 * Verantwortlich: Daten laden, Routing, Zustandsverwaltung, Event-Handling
 */

import * as storage from './storage.js';
import * as renderer from './renderer.js';

// Globale App-State
const AppState = {
  currentView: 'dashboard', // dashboard, topics, task
  currentSubject: null,
  currentTopic: null,
  subjects: [],
  topics: [],
  progress: null,
  settings: null
};

/**
 * Initialisiert die App
 */
async function initApp() {
  console.log('🚀 App wird initialisiert...');
  
  try {
    // Lade alle Daten
    await loadData();
    
    // Lade Benutzerfortschritt
    AppState.progress = await storage.getProgress();
    AppState.settings = await storage.getSettings();
    
    // Wende Einstellungen an
    applySettings();
    
    // Rendere Standard-View (Dashboard)
    await renderDashboard();
    
    // Setup globale Event-Listener
    setupEventListeners();
    
    console.log('✅ App erfolgreich gestartet');
  } catch (error) {
    console.error('❌ Fehler bei Initialisierung:', error);
    renderer.showError('mainContent', 'Fehler beim Laden der App. Bitte Seite neu laden.');
  }
}

/**
 * Lädt alle JSON-Daten
 */
async function loadData() {
  try {
    const [subjectsRes, topicsRes] = await Promise.all([
      fetch('./data/subjects.json'),
      fetch('./data/topics.json')
    ]);
    
    AppState.subjects = await subjectsRes.json();
    AppState.topics = await topicsRes.json();
    
    // Daten als Arrays extrahieren (falls im Objekt verpackt)
    if (AppState.subjects.subjects) AppState.subjects = AppState.subjects.subjects;
    if (AppState.topics.topics) AppState.topics = AppState.topics.topics;
    
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
    throw new Error('JSON-Daten konnten nicht geladen werden');
  }
}

/**
 * Rendert das Dashboard (Klassenstufen-Übersicht)
 */
async function renderDashboard() {
  AppState.currentView = 'dashboard';
  AppState.currentSubject = null;
  
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  
  // HTML-Struktur für Dashboard
  mainContent.innerHTML = `
    <div class="dashboard-header">
      <h1>📚 Mathematik Lernplattform</h1>
      <p>Wähle deine Klassenstufe</p>
      <div class="user-stats">
        <span>🏆 ${AppState.progress.totalPoints} Punkte</span>
        <span>📊 ${AppState.progress.completedTopics.length} abgeschlossene Themen</span>
      </div>
    </div>
    <div id="gradeContainer"></div>
    <div id="progressContainer" class="global-progress"></div>
  `;
  
  // Rendere Klassen-Kacheln
  renderer.renderGradeTiles(AppState.subjects, 'gradeContainer', async (subjectId) => {
    await renderTopics(subjectId);
  });
  
  // Zeige globalen Fortschritt
  const totalTopics = AppState.topics.filter(t => t.active).length;
  const globalPercentage = (AppState.progress.completedTopics.length / totalTopics) * 100;
  renderer.renderProgressBar(globalPercentage, 'progressContainer');
}

/**
 * Rendert Themen für eine ausgewählte Klasse
 */
async function renderTopics(subjectId) {
  AppState.currentView = 'topics';
  AppState.currentSubject = subjectId;
  
  const subject = AppState.subjects.find(s => s.id === subjectId);
  const mainContent = document.getElementById('mainContent');
  
  mainContent.innerHTML = `
    <div class="topics-header">
      <button class="back-button" id="backToDashboard">← Zurück</button>
      <h1>${subject?.icon || '📚'} ${subject?.name || 'Themen'}</h1>
      <p>Wähle ein Thema zum Lernen</p>
    </div>
    <div id="topicsContainer"></div>
  `;
  
  // Back-Button Event
  document.getElementById('backToDashboard')?.addEventListener('click', () => {
    renderDashboard();
  });
  
  // Lade Fortschritt für diese Klasse
  const gradeProgress = {};
  for (const topic of AppState.topics) {
    if (topic.subjectId === subjectId) {
      gradeProgress[topic.id] = await storage.getTopicProgress(topic.id);
    }
  }
  
  // Rendere Themen-Kacheln
  renderer.renderTopicTiles(
    AppState.topics, 
    subjectId, 
    'topicsContainer', 
    async (topicId) => {
      await openTopic(topicId);
    },
    gradeProgress
  );
}

/**
 * Öffnet ein Thema (später mit Aufgaben)
 */
async function openTopic(topicId) {
  const topic = AppState.topics.find(t => t.id === topicId);
  if (!topic) return;
  
  AppState.currentTopic = topic;
  console.log('Thema geöffnet:', topic.title);
  
  // Hier später: Navigation zur Topic-Seite
  alert(`Thema "${topic.title}" wird geöffnet. Hier kommen später die Aufgaben!`);
  
  // Platzhalter für spätere Implementierung
  // window.location.href = `topic.html?id=${topicId}`;
}

/**
 * Wendet gespeicherte Einstellungen an
 */
function applySettings() {
  if (AppState.settings?.darkMode) {
    document.body.classList.add('dark-mode');
  }
}

/**
 * Richtet globale Event-Listener ein
 */
function setupEventListeners() {
  // DarkMode Toggle (falls vorhanden)
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', async () => {
      document.body.classList.toggle('dark-mode');
      AppState.settings.darkMode = document.body.classList.contains('dark-mode');
      await storage.saveSettings(AppState.settings);
    });
  }
  
  // Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && AppState.currentView !== 'dashboard') {
      renderDashboard();
    }
  });
}

// App starten, sobald DOM geladen
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export für Debugging (optional)
window.debugApp = { AppState, storage };