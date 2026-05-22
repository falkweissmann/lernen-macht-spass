/**
 * pwa.js - PWA-Installation & Updates (Debug Version)
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
  }

  async init() {
    console.log('PWA Manager gestartet');
    
    // Service Worker mit Fehlerbehandlung registrieren
    await this.registerServiceWorker();
    
    // Installations-Prompt
    this.setupInstallPrompt();
    
    // Online-Status überwachen
    this.setupNetworkMonitoring();
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker nicht unterstützt');
      return false;
    }
    
    try {
      // Bestehenden Service Worker zuerst deregistrieren (für Debug)
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of existingRegistrations) {
        await registration.unregister();
        console.log('Alten Service Worker deregistriert');
      }
      
      // Neuen Service Worker registrieren
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registriert:', registration);
      
      // Auf Updates warten
      registration.addEventListener('updatefound', () => {
        console.log('Neue Service Worker Version gefunden');
      });
      
      return true;
    } catch (error) {
      console.error('Service Worker Registrierung fehlgeschlagen:', error);
      return false;
    }
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
      console.log('Installations-Prompt verfügbar');
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('App wurde installiert');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallButton();
    });
  }

  showInstallButton() {
    if (document.getElementById('installPwaBtn')) return;
    
    const installBtn = document.createElement('button');
    installBtn.id = 'installPwaBtn';
    installBtn.className = 'install-pwa-btn';
    installBtn.innerHTML = '📱 App installieren';
    installBtn.style.cssText = `
      width: 100%;
      padding: 0.75rem;
      margin-top: 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: bold;
    `;
    
    installBtn.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`Installation: ${outcome}`);
        this.deferredPrompt = null;
        this.hideInstallButton();
      }
    });
    
    const sidebar = document.querySelector('.sidebar-footer');
    if (sidebar) {
      sidebar.appendChild(installBtn);
    }
  }

  hideInstallButton() {
    const btn = document.getElementById('installPwaBtn');
    if (btn) btn.remove();
  }

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      console.log('Online');
      this.showNetworkStatus('online');
    });
    
    window.addEventListener('offline', () => {
      console.log('Offline');
      this.showNetworkStatus('offline');
    });
  }

  showNetworkStatus(status) {
    let indicator = document.getElementById('networkStatus');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'networkStatus';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        font-size: 0.875rem;
        font-weight: bold;
        z-index: 1000;
      `;
      document.body.appendChild(indicator);
    }
    
    if (status === 'online') {
      indicator.innerHTML = '🟢 Online';
      indicator.style.background = '#10b981';
      indicator.style.color = 'white';
      setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 1000);
      }, 3000);
    } else {
      indicator.innerHTML = '🔴 Offline';
      indicator.style.background = '#ef4444';
      indicator.style.color = 'white';
    }
  }
}

// PWA Manager starten
const pwaManager = new PWAManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pwaManager.init());
} else {
  pwaManager.init();
}