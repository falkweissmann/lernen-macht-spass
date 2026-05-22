/**
 * gamification.js - Kernsystem für Gamification (Reparierte Version)
 */

class GamificationSystem {
  constructor() {
    this.playerData = null;
    this.badges = [];
    this.levels = [];
    this.onLevelUp = null;
    this.onBadgeEarned = null;
    this.onStreakUpdate = null;
  }

  /**
   * Initialisiert das System
   */
  async init() {
    await this.loadData();
    await this.loadPlayerData();
    
    // Diese Methode wurde entfernt - stattdessen rufen wir updateStreak auf
    await this.updateStreak();
    await this.checkForNewBadges();
    
    return this.playerData;
  }

  /**
   * Lädt Badge- und Level-Daten
   */
  async loadData() {
    try {
      const [badgesRes, levelsRes] = await Promise.all([
        fetch('./data/badges.json'),
        fetch('./data/levels.json')
      ]);
      
      const badgesData = await badgesRes.json();
      const levelsData = await levelsRes.json();
      
      this.badges = badgesData.badges || [];
      this.levels = levelsData.levels || [];
    } catch (error) {
      console.error('Fehler beim Laden der Gamification-Daten:', error);
      this.badges = [];
      this.levels = [
        { level: 1, minXP: 0, maxXP: 100, title: "Mathe-Novize", icon: "🌱" },
        { level: 2, minXP: 100, maxXP: 250, title: "Zahlen-Lehrling", icon: "🔢" },
        { level: 3, minXP: 250, maxXP: 450, title: "Rechen-Knappe", icon: "🧮" }
      ];
    }
  }

  /**
   * Lädt Spielerdaten aus LocalStorage
   */
  async loadPlayerData() {
    const saved = localStorage.getItem('mathlern_player');
    
    if (saved) {
      this.playerData = JSON.parse(saved);
    } else {
      // Neue Spieler-Standarddaten
      this.playerData = {
        xp: 0,
        level: 1,
        points: 0,
        badges: [],
        streak: 0,
        lastLogin: new Date().toISOString(),
        stats: {
          tasksCompleted: 0,
          perfectScores: 0,
          totalPoints: 0,
          topicsCompleted: [],
          bossDefeated: [],
          timeSpent: 0,
          lastTaskTime: null,
          categoryProgress: {}
        },
        dailyChallenges: {
          date: new Date().toDateString(),
          completed: [],
          progress: {}
        },
        settings: {
          notifications: true,
          soundEnabled: true
        }
      };
      await this.savePlayerData();
    }
  }

  /**
   * Speichert Spielerdaten
   */
  async savePlayerData() {
    localStorage.setItem('mathlern_player', JSON.stringify(this.playerData));
  }

  /**
   * Aktualisiert den Streak
   */
  async updateStreak() {
    const today = new Date().toDateString();
    const lastLogin = this.playerData.lastLogin ? new Date(this.playerData.lastLogin).toDateString() : null;
    
    // Wenn heute schon eingeloggt, nichts tun
    if (lastLogin === today) {
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Prüfen ob gestern eingeloggt wurde
    if (lastLogin === yesterday.toDateString()) {
      this.playerData.streak = (this.playerData.streak || 0) + 1;
    } else {
      this.playerData.streak = 1;
    }
    
    this.playerData.lastLogin = new Date().toISOString();
    await this.savePlayerData();
    
    if (this.onStreakUpdate) {
      this.onStreakUpdate(this.playerData.streak);
    }
  }

  /**
   * Fügt XP hinzu
   */
  async addXP(amount, source = 'task') {
    const oldLevel = this.playerData.level;
    this.playerData.xp += amount;
    
    let newLevel = this.getLevelFromXP(this.playerData.xp);
    while (newLevel > this.playerData.level) {
      this.playerData.level++;
      if (this.onLevelUp) {
        this.onLevelUp(this.playerData.level, this.getLevelDetails(this.playerData.level));
      }
      newLevel = this.getLevelFromXP(this.playerData.xp);
    }
    
    await this.savePlayerData();
    return { oldLevel, newLevel: this.playerData.level, xpGained: amount };
  }

  /**
   * Fügt Punkte hinzu
   */
  async addPoints(amount) {
    this.playerData.points += amount;
    this.playerData.stats.totalPoints += amount;
    await this.savePlayerData();
    return this.playerData.points;
  }

  /**
   * Registriert eine abgeschlossene Aufgabe
   */
  async completeTask(taskId, score, timeSpent = null) {
    this.playerData.stats.tasksCompleted++;
    
    if (score === 100) {
      this.playerData.stats.perfectScores++;
    }
    
    let xpEarned = 10 + Math.floor(score / 10);
    if (timeSpent && timeSpent < 30) {
      xpEarned += 5;
    }
    
    await this.addXP(xpEarned, 'task');
    await this.addPoints(score);
    
    if (timeSpent) {
      this.playerData.stats.timeSpent += timeSpent;
      this.playerData.stats.lastTaskTime = new Date().toISOString();
    }
    
    await this.updateStreak();
    await this.savePlayerData();
    
    const newBadges = await this.checkForNewBadges();
    
    return {
      xpGained: xpEarned,
      pointsGained: score,
      newBadges,
      newLevel: this.playerData.level
    };
  }

  /**
   * Holt Level basierend auf XP
   */
  getLevelFromXP(xp) {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (xp >= this.levels[i].minXP) {
        return this.levels[i].level;
      }
    }
    return 1;
  }

  /**
   * Holt Level-Details
   */
  getLevelDetails(level) {
    return this.levels.find(l => l.level === level) || this.levels[0];
  }

  /**
   * Prüft und vergibt neue Badges
   */
  async checkForNewBadges() {
    const newBadges = [];
    
    for (const badge of this.badges) {
      if (this.playerData.badges.some(b => b.id === badge.id)) {
        continue;
      }
      
      let earned = false;
      
      switch (badge.requirement?.type) {
        case 'tasks_completed':
          earned = this.playerData.stats.tasksCompleted >= badge.requirement.threshold;
          break;
        case 'perfect_score':
          earned = this.playerData.stats.perfectScores >= badge.requirement.threshold;
          break;
        case 'streak':
          earned = (this.playerData.streak || 0) >= badge.requirement.threshold;
          break;
        default:
          earned = false;
      }
      
      if (earned) {
        const earnedBadge = {
          ...badge,
          earnedAt: new Date().toISOString()
        };
        
        this.playerData.badges.push(earnedBadge);
        await this.addXP(badge.points || 10, 'badge');
        newBadges.push(earnedBadge);
        
        if (this.onBadgeEarned) {
          this.onBadgeEarned(badge);
        }
      }
    }
    
    await this.savePlayerData();
    return newBadges;
  }

  /**
   * Holt Statistiken
   */
  getStats() {
    const nextLevelProgress = this.getNextLevelProgress();
    const currentLevel = this.getLevelDetails(this.playerData.level);
    
    return {
      level: this.playerData.level,
      levelTitle: currentLevel?.title || "Mathe-Novize",
      levelIcon: currentLevel?.icon || "🌱",
      xp: this.playerData.xp,
      points: this.playerData.points,
      streak: this.playerData.streak || 0,
      nextLevelProgress,
      badgesCount: this.playerData.badges.length,
      tasksCompleted: this.playerData.stats.tasksCompleted,
      perfectScores: this.playerData.stats.perfectScores,
      totalPoints: this.playerData.stats.totalPoints,
      timeSpent: this.playerData.stats.timeSpent,
      recentBadges: this.playerData.badges.slice(-3)
    };
  }

  /**
   * Berechnet nächsten Level-Fortschritt
   */
  getNextLevelProgress() {
    const currentLevel = this.getLevelDetails(this.playerData.level);
    const nextLevel = this.getLevelDetails(this.playerData.level + 1);
    
    if (!nextLevel) {
      return { current: this.playerData.xp - currentLevel.minXP, max: currentLevel.maxXP - currentLevel.minXP, percentage: 100 };
    }
    
    const currentXPInLevel = this.playerData.xp - currentLevel.minXP;
    const neededForNext = nextLevel.minXP - currentLevel.minXP;
    const percentage = (currentXPInLevel / neededForNext) * 100;
    
    return {
      current: currentXPInLevel,
      max: neededForNext,
      percentage: Math.min(100, percentage)
    };
  }

  /**
   * Holt alle Badges mit Kategorien
   */
  getBadgesByCategory() {
    const ownedIds = this.playerData.badges.map(b => b.id);
    
    const categories = {
      progress: { name: "Fortschritt", badges: [] },
      performance: { name: "Leistung", badges: [] },
      streak: { name: "Serien", badges: [] },
      special: { name: "Speziell", badges: [] }
    };
    
    for (const badge of this.badges) {
      const owned = ownedIds.includes(badge.id);
      const category = categories[badge.category] || categories.progress;
      
      category.badges.push({
        ...badge,
        owned,
        earnedAt: owned ? this.playerData.badges.find(b => b.id === badge.id).earnedAt : null
      });
    }
    
    return categories;
  }

  /**
   * Holt Fortschritt für ein Thema
   */
  getTopicProgress(topicId, totalTasks) {
    const completed = this.playerData.stats.topicsCompleted.includes(topicId);
    return {
      completed,
      percentage: completed ? 100 : 0
    };
  }
}

// Singleton-Export
export const gamification = new GamificationSystem();