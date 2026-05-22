/**
 * taskTypes.js - Registry für alle Aufgabentypen
 * Verantwortlich: Definition von Renderern und Validatoren pro Typ
 */

export class TaskTypeRegistry {
  constructor() {
    this.types = new Map();
  }

  /**
   * Registriert einen neuen Aufgabentyp
   * @param {string} type - Name des Typs (z.B. 'input')
   * @param {Object} handlers - { renderer, validator, eventHandlers }
   */
  register(type, handlers) {
    if (this.types.has(type)) {
      console.warn(`Aufgabentyp '${type}' wird überschrieben`);
    }
    this.types.set(type, handlers);
    console.log(`✅ Aufgabentyp '${type}' registriert`);
  }

  getRenderer(type) {
    return this.types.get(type)?.renderer || this.getDefaultRenderer();
  }

  getValidator(type) {
    return this.types.get(type)?.validator || this.getDefaultValidator();
  }

  getEventHandlers(type) {
    return this.types.get(type)?.eventHandlers || {};
  }

  getDefaultRenderer() {
    return (task, answer, onChange) => {
      return `<div class="task-error">⚠️ Unbekannter Aufgabentyp: ${task.type}</div>`;
    };
  }

  getDefaultValidator() {
    return (answer, solution, validation) => {
      return { correct: false, message: "Validierung nicht verfügbar" };
    };
  }
}

// Globale Instanz
export const taskRegistry = new TaskTypeRegistry();

// ============================================
// INPUT-TYP
// ============================================
taskRegistry.register('input', {
  renderer: (task, currentAnswer, onChange) => {
    return `
      <div class="task-input">
        <label for="task-answer">Deine Antwort:</label>
        <input 
          type="text" 
          id="task-answer" 
          class="answer-input" 
          value="${currentAnswer || ''}"
          placeholder="Gib hier deine Lösung ein..."
          data-task-id="${task.id}"
        >
        ${task.unit ? `<span class="unit">${task.unit}</span>` : ''}
      </div>
    `;
  },
  
  validator: (answer, solution, validation, task) => {
    const userAnswer = parseFloat(answer);
    const isNumeric = !isNaN(userAnswer);
    
    if (validation.type === 'numeric') {
      let expectedValue = solution;
      
      // Lösung kann Formel sein (z.B. "({{c}}-{{b}})/{{a}}")
      if (typeof solution === 'string' && solution.includes('{{')) {
        // Wird später mit aktuellen Parametern evaluiert
        expectedValue = evaluateTemplate(solution, task.currentParams);
      }
      
      const diff = Math.abs(userAnswer - expectedValue);
      const tolerance = validation.tolerance || 0;
      const correct = diff <= tolerance;
      
      return {
        correct,
        score: correct ? task.points : 0,
        message: correct ? validation.correctMessage || "✅ Richtig!" : validation.incorrectMessage || `❌ Falsch. Die richtige Lösung ist ${expectedValue}.`,
        userAnswer: userAnswer,
        expected: expectedValue
      };
    }
    
    return { correct: false, score: 0, message: "Ungültiges Format" };
  },
  
  eventHandlers: {
    onChange: (element, callback) => {
      element.addEventListener('input', (e) => callback(e.target.value));
    }
  }
});

// ============================================
// MULTIPLE-CHOICE-TYP
// ============================================
taskRegistry.register('multiple-choice', {
  renderer: (task, currentAnswer, onChange) => {
    const selected = currentAnswer ? currentAnswer.split(',') : [];
    
    return `
      <div class="task-mc">
        <div class="options-list">
          ${task.options.map(opt => `
            <label class="mc-option" data-option-id="${opt.id}">
              <input 
                type="radio" 
                name="mc-group" 
                value="${opt.id}"
                ${selected.includes(opt.id) ? 'checked' : ''}
              >
              <span>${opt.text}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  },
  
  validator: (answer, solution, validation, task) => {
    const userAnswers = answer ? answer.split(',') : [];
    const correctAnswers = validation.solution || solution;
    
    const isCorrect = userAnswers.length === 1 && 
                      correctAnswers.includes(userAnswers[0]) &&
                      JSON.stringify(userAnswers.sort()) === JSON.stringify([correctAnswers[0]]);
    
    return {
      correct: isCorrect,
      score: isCorrect ? task.points : 0,
      message: isCorrect ? "✅ Richtig!" : `❌ Falsch. Die richtige Antwort ist: ${getOptionText(task.options, correctAnswers[0])}`,
      userAnswer: userAnswers,
      expected: correctAnswers
    };
  },
  
  eventHandlers: {
    onChange: (element, callback) => {
      const radios = element.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        radio.addEventListener('change', () => {
          const selected = Array.from(radios)
            .filter(r => r.checked)
            .map(r => r.value);
          callback(selected.join(','));
        });
      });
    }
  }
});

// ============================================
// MULTI-SELECT-TYP
// ============================================
taskRegistry.register('multi-select', {
  renderer: (task, currentAnswer, onChange) => {
    const selected = currentAnswer ? currentAnswer.split(',') : [];
    
    return `
      <div class="task-multi">
        <p class="instruction">Wähle alle zutreffenden Optionen aus:</p>
        <div class="options-list">
          ${task.options.map(opt => `
            <label class="multi-option" data-option-id="${opt.id}">
              <input 
                type="checkbox" 
                value="${opt.id}"
                ${selected.includes(opt.id) ? 'checked' : ''}
              >
              <span>${opt.text}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  },
  
  validator: (answer, solution, validation, task) => {
    const userAnswers = answer ? answer.split(',') : [];
    const correctAnswers = validation.solution || solution;
    
    const sortedUser = [...userAnswers].sort();
    const sortedCorrect = [...correctAnswers].sort();
    
    const isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    
    let message = isCorrect ? "✅ Richtig!" : "❌ Nicht ganz richtig. ";
    if (!isCorrect) {
      const missing = correctAnswers.filter(a => !userAnswers.includes(a));
      const extra = userAnswers.filter(a => !correctAnswers.includes(a));
      if (missing.length) message += ` Du hast ${missing.map(m => getOptionText(task.options, m)).join(', ')} vergessen.`;
      if (extra.length) message += ` ${extra.map(e => getOptionText(task.options, e)).join(', ')} ist/sind falsch.`;
    }
    
    return {
      correct: isCorrect,
      score: isCorrect ? task.points : 0,
      message: message,
      userAnswer: userAnswers,
      expected: correctAnswers
    };
  },
  
  eventHandlers: {
    onChange: (element, callback) => {
      const checkboxes = element.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const selected = Array.from(checkboxes)
            .filter(c => c.checked)
            .map(c => c.value);
          callback(selected.join(','));
        });
      });
    }
  }
});

// ============================================
// ORDERING-TYP (Drag & Drop Sortierung)
// ============================================
taskRegistry.register('ordering', {
  renderer: (task, currentAnswer, onChange) => {
    const order = currentAnswer ? JSON.parse(currentAnswer) : task.items.map(i => i.id);
    const items = order.map(id => task.items.find(i => i.id === id));
    
    return `
      <div class="task-ordering">
        <p class="instruction">Ordne die Elemente durch Ziehen:</p>
        <div class="sortable-list" data-task-id="${task.id}">
          ${items.map((item, idx) => `
            <div class="sortable-item" data-id="${item.id}" draggable="true">
              <span class="drag-handle">⋮⋮</span>
              <span class="item-value">${item.value}</span>
              <span class="item-index">${idx + 1}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  
  validator: (answer, solution, validation, task) => {
    const userOrder = answer ? JSON.parse(answer) : [];
    const correctOrder = validation.correctOrder;
    
    const isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
    
    return {
      correct: isCorrect,
      score: isCorrect ? task.points : 0,
      message: isCorrect ? "✅ Perfekt sortiert!" : "❌ Die Reihenfolge ist nicht korrekt. Versuche es noch einmal.",
      userAnswer: userOrder,
      expected: correctOrder
    };
  },
  
  eventHandlers: {
    onChange: (element, callback) => {
      let dragSrc = null;
      const items = element.querySelectorAll('.sortable-item');
      
      items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
          dragSrc = item;
          e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          if (dragSrc !== item) {
            const parent = item.parentNode;
            const children = Array.from(parent.children);
            const dragIndex = children.indexOf(dragSrc);
            const dropIndex = children.indexOf(item);
            
            if (dragIndex < dropIndex) {
              item.parentNode.insertBefore(dragSrc, item.nextSibling);
            } else {
              item.parentNode.insertBefore(dragSrc, item);
            }
            
            const newOrder = Array.from(parent.querySelectorAll('.sortable-item'))
              .map(el => el.dataset.id);
            callback(JSON.stringify(newOrder));
          }
        });
      });
    }
  }
});

// ============================================
// COORDINATE-SYSTEM-TYP
// ============================================
taskRegistry.register('coordinate-system', {
  renderer: (task, currentAnswer, onChange) => {
    const canvasId = `coord-canvas-${task.id}`;
    const point = currentAnswer ? JSON.parse(currentAnswer) : null;
    
    return `
      <div class="task-coordinate">
        <canvas id="${canvasId}" width="400" height="400" style="border:1px solid #ccc; touch-action: none;"></canvas>
        <p class="instruction">Klicke auf den Punkt im Koordinatensystem</p>
        <div id="coord-feedback-${task.id}"></div>
      </div>
    `;
  },
  
  validator: (answer, solution, validation, task) => {
    const userPoint = answer ? JSON.parse(answer) : null;
    if (!userPoint) return { correct: false, score: 0, message: "Bitte klicke einen Punkt an" };
    
    const targetX = task.parameters.targetX.fixed;
    const targetY = task.parameters.targetY.fixed;
    const tolerance = validation.tolerance || 0.5;
    
    const dx = Math.abs(userPoint.x - targetX);
    const dy = Math.abs(userPoint.y - targetY);
    const distance = Math.sqrt(dx*dx + dy*dy);
    const isCorrect = distance <= tolerance;
    
    return {
      correct: isCorrect,
      score: isCorrect ? task.points : 0,
      message: isCorrect ? "✅ Punkt getroffen!" : `❌ Der Punkt (${userPoint.x.toFixed(1)}, ${userPoint.y.toFixed(1)}) ist nicht richtig. Gesucht war (${targetX}, ${targetY}).`,
      userAnswer: userPoint,
      expected: { x: targetX, y: targetY }
    };
  },
  
  eventHandlers: {
    onMount: (element, task, callback) => {
      const canvas = element.querySelector('canvas');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const axisRange = task.axisRange || { x: [-5, 5], y: [-5, 5] };
      
      function drawGrid() {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        
        // Gitter zeichnen
        const xStep = width / (axisRange.x[1] - axisRange.x[0]);
        const yStep = height / (axisRange.y[1] - axisRange.y[0]);
        
        for (let x = axisRange.x[0]; x <= axisRange.x[1]; x++) {
          const screenX = (x - axisRange.x[0]) * xStep;
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, height);
          ctx.stroke();
        }
        
        for (let y = axisRange.y[0]; y <= axisRange.y[1]; y++) {
          const screenY = height - (y - axisRange.y[0]) * yStep;
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(width, screenY);
          ctx.stroke();
        }
        
        // Achsen
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        const originX = (0 - axisRange.x[0]) * xStep;
        const originY = height - (0 - axisRange.y[0]) * yStep;
        
        ctx.beginPath();
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.stroke();
      }
      
      function drawPoint(x, y, color = 'red') {
        const xStep = width / (axisRange.x[1] - axisRange.x[0]);
        const yStep = height / (axisRange.y[1] - axisRange.y[0]);
        const screenX = (x - axisRange.x[0]) * xStep;
        const screenY = height - (y - axisRange.y[0]) * yStep;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      function screenToWorld(screenX, screenY) {
        const xStep = width / (axisRange.x[1] - axisRange.x[0]);
        const yStep = height / (axisRange.y[1] - axisRange.y[0]);
        const worldX = axisRange.x[0] + screenX / xStep;
        const worldY = axisRange.y[1] - screenY / yStep;
        return { x: worldX, y: worldY };
      }
      
      drawGrid();
      
      let isDragging = false;
      
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        const worldPoint = screenToWorld(mouseX, mouseY);
        drawGrid();
        drawPoint(worldPoint.x, worldPoint.y, 'green');
        
        callback(JSON.stringify({ x: worldPoint.x, y: worldPoint.y }));
      });
    }
  }
});

// Hilfsfunktionen
function getOptionText(options, id) {
  const opt = options.find(o => o.id === id);
  return opt ? opt.text : id;
}

function evaluateTemplate(template, params) {
  // Einfache Template-Evaluierung für Formeln
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  try {
    // Sicherheitshalber nur mathematische Ausdrücke erlauben
    return Function('"use strict";return (' + result + ')')();
  } catch {
    return result;
  }
}