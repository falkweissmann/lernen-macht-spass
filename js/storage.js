/**
 * storage.js - Lokale Speicherung von Benutzerfortschritten
 * Verantwortlich: Alle LocalStorage-Operationen
 */

const STORAGE_KEYS = {
  PROGRESS: 'mathlern_progress',
  SETTINGS: 'mathlern_settings',
  COMPLETED: 'mathlern_completed'
};

// Standard-Datenstruktur für neuen Benutzer
const DEFAULT_PROGRESS = {
  totalPoints: 0,
  level: 1,
  completedTopics: [],      // Array von topic IDs
  topicProgress: {},        // { topicId: { score, lastAccess, attempts } }
  badges: [],               // Errungenschaften
  lastLogin: new Date().toISOString()
};

/**
 * Holt den gesamten Fortschritt
 */
export async function getProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!saved) {
      await saveProgress(DEFAULT_PROGRESS);
      return { ...DEFAULT_PROGRESS };
    }
    return JSON.parse(saved);
  } catch (error) {
    console.error('Fehler beim Laden des Fortschritts:', error);
    return { ...DEFAULT_PROGRESS };
  }
}

/**
 * Speichert kompletten Fortschritt
 */
export async function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    return false;
  }
}

/**
 * Aktualisiert spezifische Felder im Fortschritt
 */
export async function updateProgress(updates) {
  const current = await getProgress();
  const updated = { ...current, ...updates, lastLogin: new Date().toISOString() };
  return await saveProgress(updated);
}

/**
 * Markiert ein Thema als abgeschlossen
 */
export async function completeTopic(topicId, score = 100) {
  const progress = await getProgress();
  
  if (!progress.completedTopics.includes(topicId)) {
    progress.completedTopics.push(topicId);
    progress.totalPoints += score;
    
    // Fortschritt für dieses Thema speichern
    progress.topicProgress[topicId] = {
      completed: true,
      score: score,
      completedAt: new Date().toISOString(),
      attempts: (progress.topicProgress[topicId]?.attempts || 0) + 1
    };
    
    await saveProgress(progress);
    return true;
  }
  return false;
}

/**
 * Holt den Fortschritt für ein spezifisches Thema
 */
export async function getTopicProgress(topicId) {
  const progress = await getProgress();
  return progress.topicProgress[topicId] || {
    completed: false,
    score: 0,
    attempts: 0
  };
}

/**
 * Berechnet Gesamtfortschritt für eine Klassenstufe
 */
export async function getGradeProgress(subjectId, allTopics) {
  const progress = await getProgress();
  const gradeTopics = allTopics.filter(t => t.subjectId === subjectId);
  
  const completedCount = gradeTopics.filter(t => 
    progress.completedTopics.includes(t.id)
  ).length;
  
  return {
    completed: completedCount,
    total: gradeTopics.length,
    percentage: gradeTopics.length > 0 ? (completedCount / gradeTopics.length) * 100 : 0
  };
}

/**
 * Setzt Fortschritt zurück (für Tests)
 */
export async function resetProgress() {
  return await saveProgress({ ...DEFAULT_PROGRESS });
}

/**
 * Speichert Benutzereinstellungen (Darkmode, etc.)
 */
export async function getSettings() {
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!saved) {
    return { darkMode: false, soundEnabled: true, notifications: true };
  }
  return JSON.parse(saved);
}

export async function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}