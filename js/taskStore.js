/**
 * taskStore.js - Speicherung von Aufgabenstatus
 */

const STORAGE_KEY = 'mathlern_tasks';

export class TaskStore {
  constructor() {
    this.cache = new Map();
  }

  async getTaskStatus(taskId) {
    try {
      const allTasks = await this.getAllTasks();
      return allTasks[taskId] || {
        taskId: taskId,
        completed: false,
        attempts: 0,
        answer: null,
        score: 0,
        hintIndex: 0
      };
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      return null;
    }
  }

  async saveTaskStatus(status) {
    try {
      const allTasks = await this.getAllTasks();
      status.attempts = (status.attempts || 0) + 1;
      allTasks[status.taskId] = status;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      return false;
    }
  }

  async getAllTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  async resetTask(taskId) {
    const allTasks = await this.getAllTasks();
    delete allTasks[taskId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
  }
}