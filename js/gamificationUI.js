/**
 * gamificationUI.js - UI-Komponenten für Gamification
 */

import { gamification } from './gamification.js';

/**
 * Rendert die Level-Anzeige
 */
export function renderLevelCard(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const stats = gamification.getStats();
  const currentLevel = gamification.getLevelDetails(stats.level);
  
  container.innerHTML = `
    <div class="level-card">
      <div class="level-header">
        <span class="level-icon">${currentLevel.icon}</span>
        <div class="level-info">
          <h3>Level ${stats.level}</h3>
          <p>${currentLevel.title}</p>
        </div>
      </div>
      <div class="xp-progress">
        <div class="progress-bar-container">
          <div class="progress-fill" style="width: ${stats.nextLevelProgress.percentage}%"></div>
        </div>
        <div class="xp-text">
          ${stats.xp} XP / ${stats.xp + (stats.nextLevelProgress.max - stats.nextLevelProgress.current)} XP
        </div>
      </div>
    </div>
  `;
}

/**
 * Rendert die Streak-Anzeige
 */
export function renderStreakCard(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const stats = gamification.getStats();
  
  container.innerHTML = `
    <div class="streak-card">
      <div class="streak-icon ${stats.streak > 0 ? 'active' : ''}">🔥</div>
      <div class="streak-info">
        <div class="streak-days">${stats.streak} Tage</div>
        <div class="streak-label">Lern-Serie</div>
      </div>
    </div>
  `;
}

/**
 * Rendert die Punktestatistik
 */
export function renderPointsCard(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const stats = gamification.getStats();
  
  container.innerHTML = `
    <div class="points-card">
      <div class="points-total">
        <span class="points-icon">🏆</span>
        <span class="points-value">${stats.totalPoints}</span>
        <span class="points-label">Gesamtpunkte</span>
      </div>
      <div class="points-breakdown">
        <div class="point-item">
          <span>✅ Aufgaben:</span>
          <span>${stats.tasksCompleted}</span>
        </div>
        <div class="point-item">
          <span>⭐ Perfekt:</span>
          <span>${stats.perfectScores}</span>
        </div>
        <div class="point-item">
          <span>⏱️ Lernzeit:</span>
          <span>${Math.floor(stats.timeSpent / 60)} min</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Rendert die täglichen Challenges
 */
export async function renderDailyChallenges(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const challenges = await gamification.getDailyChallenges();
  const playerData = gamification.playerData;
  const completed = playerData.dailyChallenges.completed || [];
  
  container.innerHTML = `
    <div class="challenges-container">
      <h3>📅 Tägliche Herausforderungen</h3>
      <div class="challenges-grid">
        ${challenges.map(challenge => {
          const isCompleted = completed.includes(challenge.id);
          const progress = playerData.dailyChallenges.progress[challenge.type] || 0;
          const progressPercent = Math.min(100, (progress / challenge.target) * 100);
          
          return `
            <div class="challenge-card ${isCompleted ? 'completed' : ''}">
              <div class="challenge-icon">${challenge.icon}</div>
              <div class="challenge-content">
                <h4>${challenge.title}</h4>
                <p>${challenge.description}</p>
                <div class="challenge-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                  </div>
                  <span class="progress-text">${progress}/${challenge.target}</span>
                </div>
                <div class="challenge-reward">
                  🎁 ${challenge.xpReward} XP
                </div>
              </div>
              ${isCompleted ? '<div class="completed-badge">✅</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Rendert Badge-Sammlung
 */
export function renderBadgeCollection(containerId, category = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const badgesByCategory = gamification.getBadgesByCategory();
  
  let html = '<div class="badge-collection">';
  
  for (const [catKey, catData] of Object.entries(badgesByCategory)) {
    if (category && category !== catKey) continue;
    
    html += `
      <div class="badge-category">
        <h3>${catData.name}</h3>
        <div class="badge-grid">
    `;
    
    for (const badge of catData.badges) {
      html += `
        <div class="badge-card ${badge.owned ? 'earned' : 'locked'}">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-description">${badge.description}</div>
          ${badge.owned ? `<div class="badge-earned">Erhalten: ${new Date(badge.earnedAt).toLocaleDateString()}</div>` : '<div class="badge-locked">🔒 Noch nicht freigeschaltet</div>'}
        </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Rendert Fortschrittsbalken für Themen
 */
export function renderTopicProgressBar(topicId, totalTasks, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const progress = gamification.getTopicProgress(topicId, totalTasks);
  
  container.innerHTML = `
    <div class="topic-progress">
      <div class="progress-bar-container">
        <div class="progress-fill" style="width: ${progress.percentage}%"></div>
      </div>
      <div class="progress-text">${Math.round(progress.percentage)}% abgeschlossen</div>
    </div>
  `;
}

/**
 * Zeigt Level-Up Benachrichtigung an
 */
export function showLevelUpNotification(level, levelDetails) {
  const notification = document.createElement('div');
  notification.className = 'level-up-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="level-icon">${levelDetails.icon}</span>
      <div class="level-text">
        <strong>LEVEL UP!</strong>
        <span>Du hast Level ${level} erreicht</span>
        <span class="level-title">${levelDetails.title}</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Zeigt Badge-Benachrichtigung an
 */
export function showBadgeNotification(badge) {
  const notification = document.createElement('div');
  notification.className = 'badge-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="badge-icon">${badge.icon}</span>
      <div class="badge-text">
        <strong>Neuer Erfolg!</strong>
        <span>${badge.name}</span>
        <span class="badge-desc">${badge.description}</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

/**
 * Initialisiert Gamification UI Events
 */
export function initGamificationUI() {
  // Level-Up Callback
  gamification.onLevelUp = (level, levelDetails) => {
    showLevelUpNotification(level, levelDetails);
  };
  
  // Badge Callback
  gamification.onBadgeEarned = (badge) => {
    showBadgeNotification(badge);
  };
  
  // Streak Callback
  gamification.onStreakUpdate = (streak) => {
    const streakCard = document.querySelector('.streak-card');
    if (streakCard) {
      const streakDays = streakCard.querySelector('.streak-days');
      if (streakDays) {
        streakDays.textContent = `${streak} Tage`;
      }
    }
  };
}