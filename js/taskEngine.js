/**
 * taskEngine.js - Zentrale Aufgaben-Engine
 * Verantwortlich: Laden, Verwalten, Fortschritt von Aufgaben
 */

import { taskRegistry } from './taskTypes.js';
import { TaskStore } from './taskStore.js';

export class TaskEngine {
  constructor() {
    this.currentTask = null;
    this.currentAnswer = null;
    this.taskStatus = {};
    this.store = new TaskStore();
    this.onTaskComplete = null;
    this.onProgressUpdate = null;
  }

  /**
   * Lädt eine Aufgabe aus JSON
   */
  async loadTask(taskId) {
    try {
      const response = await fetch('./data/tasks.json');
      const data = await response.json();
      const tasks = data.tasks || data;
      this.currentTask = tasks.find(t => t.id === taskId);
      
      if (!this.currentTask) {
        throw new Error(`Aufgabe ${taskId} nicht gefunden`);
      }
      
      // Generiere zufällige Parameter falls nötig
      if (this.currentTask.randomizable) {
        this.currentTask = this.generateRandomParameters(this.currentTask);
      }
      
      // Lade gespeicherten Status
      const savedStatus = await this.store.getTaskStatus(taskId);
      if (savedStatus) {
        this.currentAnswer = savedStatus.answer;
        this.taskStatus = savedStatus;
      }
      
      return this.currentTask;
    } catch (error) {
      console.error('Fehler beim Laden der Aufgabe:', error);
      throw error;
    }
  }

  /**
   * Generiert zufällige Parameter für eine Aufgabe
   */
  generateRandomParameters(task) {
    if (!task.parameters) return task;
    
    const params = {};
    for (const [key, range] of Object.entries(task.parameters)) {
      if (range.min !== undefined && range.max !== undefined) {
        params[key] = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      } else if (range.fixed !== undefined) {
        params[key] = range.fixed;
      }
    }
    
    // Template für die Aufgabenstellung generieren
    let taskText = task.template;
    for (const [key, value] of Object.entries(params)) {
      taskText = taskText.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    // Lösung berechnen
    let solution = task.solution;
    if (typeof solution === 'string' && solution.includes('{{')) {
      for (const [key, value] of Object.entries(params)) {
        solution = solution.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      try {
        solution = Function('"use strict";return (' + solution + ')')();
      } catch (e) {
        console.warn('Lösung konnte nicht berechnet werden:', solution);
      }
    }
    
    return {
      ...task,
      currentParams: params,
      taskText: taskText,
      currentSolution: solution
    };
  }

  /**
   * Rendert die Aufgabe in einen Container
   */
  async renderTask(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!this.currentTask) {
      container.innerHTML = '<div class="error">Keine Aufgabe geladen</div>';
      return;
    }
    
    const task = this.currentTask;
    const renderer = taskRegistry.getRenderer(task.type);
    
    // HTML-Struktur
    container.innerHTML = `
      <div class="task-container" data-task-id="${task.id}">
        <div class="task-header">
          <h2>${task.title}</h2>
          <div class="task-meta">
            <span class="difficulty">${'⭐'.repeat(task.difficulty)}</span>
            <span class="points">🏆 ${task.points} Punkte</span>
            ${task.timeLimit ? `<span class="timer">⏱️ <span id="timer">${task.timeLimit}</span>s</span>` : ''}
          </div>
          <p class="task-description">${task.description}</p>
        </div>
        
        <div class="task-content" id="taskContent">
          ${task.taskText ? `<div class="task-question">${task.taskText}</div>` : ''}
          ${renderer(task, this.currentAnswer, (newAnswer) => {
            this.currentAnswer = newAnswer;
            this.saveCurrentProgress();
          })}
        </div>
        
        <div class="task-footer">
          <button id="checkAnswerBtn" class="btn-check">✅ Antwort prüfen</button>
          <button id="hintBtn" class="btn-hint" style="display: ${task.hints ? 'inline-block' : 'none'}">💡 Hinweis</button>
          <div id="feedback" class="feedback"></div>
        </div>
      </div>
    `;
    
    // Event-Handler für den Aufgabentyp
    const taskContent = document.getElementById('taskContent');
    const handlers = taskRegistry.getEventHandlers(task.type);
    
    if (handlers.onMount) {
      handlers.onMount(taskContent, task, (newAnswer) => {
        this.currentAnswer = newAnswer;
        this.saveCurrentProgress();
      });
    }
    
    if (handlers.onChange) {
      handlers.onChange(taskContent, (newAnswer) => {
        this.currentAnswer = newAnswer;
        this.saveCurrentProgress();
      });
    }
    
    // Button-Listener
    document.getElementById('checkAnswerBtn')?.addEventListener('click', () => {
      this.checkAnswer();
    });
    
    document.getElementById('hintBtn')?.addEventListener('click', () => {
      this.showHint();
    });
    
    // Timer starten
    if (task.timeLimit) {
      this.startTimer(task.timeLimit);
    }
  }

  /**
   * Überprüft die Antwort
   */
  checkAnswer() {
    const validator = taskRegistry.getValidator(this.currentTask.type);
    const result = validator(
      this.currentAnswer,
      this.currentTask.currentSolution || this.currentTask.solution,
      this.currentTask.validation,
      this.currentTask
    );
    
    const feedbackDiv = document.getElementById('feedback');
    if (feedbackDiv) {
      feedbackDiv.innerHTML = `
        <div class="feedback-message ${result.correct ? 'correct' : 'incorrect'}">
          ${result.message}
          ${!result.correct && result.expected ? `<div class="expected">Erwartet: ${JSON.stringify(result.expected)}</div>` : ''}
        </div>
      `;
    }
    
    if (result.correct) {
      // Aufgabe als abgeschlossen markieren
      this.taskStatus.completed = true;
      this.taskStatus.score = result.score;
      this.taskStatus.completedAt = new Date().toISOString();
      this.saveCurrentProgress();
      
      // Check-Button deaktivieren
      const checkBtn = document.getElementById('checkAnswerBtn');
      if (checkBtn) checkBtn.disabled = true;
      
      // Callback für Abschluss
      if (this.onTaskComplete) {
        this.onTaskComplete(this.currentTask.id, result.score);
      }
    }
    
    // Fortschrittsupdate
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.taskStatus);
    }
  }

  /**
   * Zeigt einen Hinweis an
   */
  showHint() {
    const hints = this.currentTask.hints;
    if (!hints || hints.length === 0) return;
    
    const hintIndex = this.taskStatus.hintIndex || 0;
    if (hintIndex < hints.length) {
      const feedbackDiv = document.getElementById('feedback');
      if (feedbackDiv) {
        feedbackDiv.innerHTML = `
          <div class="feedback-message hint">
            💡 ${hints[hintIndex]}
          </div>
        `;
      }
      this.taskStatus.hintIndex = hintIndex + 1;
      this.saveCurrentProgress();
    }
  }

  /**
   * Startet den Timer
   */
  startTimer(seconds) {
    let timeLeft = seconds;
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    const interval = setInterval(() => {
      timeLeft--;
      if (timerElement) timerElement.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        const feedbackDiv = document.getElementById('feedback');
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `
            <div class="feedback-message incorrect">
              ⏰ Zeit abgelaufen! Die Aufgabe wurde automatisch abgebrochen.
            </div>
          `;
        }
        document.getElementById('checkAnswerBtn')?.setAttribute('disabled', 'disabled');
      }
    }, 1000);
    
    this.taskStatus.timer = interval;
  }

  /**
   * Speichert aktuellen Fortschritt
   */
  async saveCurrentProgress() {
    if (!this.currentTask) return;
    
    this.taskStatus.taskId = this.currentTask.id;
    this.taskStatus.answer = this.currentAnswer;
    this.taskStatus.lastUpdated = new Date().toISOString();
    
    await this.store.saveTaskStatus(this.taskStatus);
  }
}