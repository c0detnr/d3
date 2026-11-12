import './loadingScreen.css';

export type LoadingLanguage = 'tr' | 'en';

export interface LoadingDictionary {
  loading: string;
  preparingMission: string;
  webglError: string;
  assetError: string;
  retry: string;
  tips: string[];
}

export const LOADING_TEXTS: Record<LoadingLanguage, LoadingDictionary> = {
  tr: {
    loading: 'Yükleniyor...',
    preparingMission: 'Görev hazırlanıyor...',
    webglError: 'WebGL 2.0 desteklenmiyor veya devre dışı. Lütfen tarayıcınızın donanım ivmesini kontrol edin.',
    assetError: 'Oyun varlıkları yüklenirken bir hata oluştu.',
    retry: 'Yeniden dene',
    tips: [
      'Sis perdesi düşmanın görüşünü keser.',
      'Fareyle bak, kule takip eder.',
      'Gövde açısı mermilerin sekme şansını artırır.',
      'Düşman tankının yan ve arka zırhı daha zayıftır.',
      'Hareket halindeyken atış yapmak isabet oranını düşürür.',
      'Zorlu arazilerde palet çekişini korumak için hızını ayarla.',
    ],
  },
  en: {
    loading: 'Loading...',
    preparingMission: 'Preparing mission...',
    webglError: 'WebGL 2.0 is not supported or disabled. Please check your browser hardware acceleration.',
    assetError: 'Failed to load game assets.',
    retry: 'Retry',
    tips: [
      'Smoke screen blocks enemy line of sight.',
      'Look with the mouse, the turret follows.',
      'Angling your hull increases the chance of ricochets.',
      'Enemy side and rear armor is significantly weaker.',
      'Firing on the move reduces accuracy.',
      'Adjust speed in rough terrain to maintain track traction.',
    ],
  },
};

export function detectLanguage(): LoadingLanguage {
  try {
    const raw = localStorage.getItem('iron-dust.player.v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.settings?.language === 'en') return 'en';
      if (parsed?.settings?.language === 'tr') return 'tr';
    }
  } catch {
    // Storage access blocked or denied
  }
  if (typeof navigator !== 'undefined' && navigator.language && !navigator.language.toLowerCase().startsWith('tr')) {
    return 'en';
  }
  return 'tr';
}

export function isWebGL2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch (err) {
    console.error('[IRON DUST] WebGL 2 check exception:', err);
    return false;
  }
}

export class LoadingScreen {
  private element: HTMLElement | null = null;
  private barFill: HTMLElement | null = null;
  private stageText: HTMLElement | null = null;
  private percentText: HTMLElement | null = null;
  private tipText: HTMLElement | null = null;
  private errorBox: HTMLElement | null = null;
  private errorMsg: HTMLElement | null = null;
  private retryBtn: HTMLElement | null = null;

  private language: LoadingLanguage;
  private texts: LoadingDictionary;
  private tipIndex = 0;
  private tipTimer: ReturnType<typeof setInterval> | null = null;
  private statusObserver: MutationObserver | null = null;
  private perfObserver: PerformanceObserver | null = null;

  private progress = 0;
  private completed = false;
  private hasError = false;
  private isMissionMode = false;

  private scriptsLoaded = 0;
  private wasmLoadedBytes = 0;
  private wasmTotalBytes = 2094563; // Estimated default Havok size
  private glbLoadedBytes = 0;
  private glbTotalBytes = 0;
  private statusWeight = 0;

  constructor() {
    this.language = detectLanguage();
    this.texts = LOADING_TEXTS[this.language];
    this.initDOM();
    this.setupInterceptors();
    this.checkEnvironment();
    this.startTipRotation();
    this.observeStatus();
  }

  private initDOM() {
    this.element = document.getElementById('loading-screen');
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.id = 'loading-screen';
      this.element.className = 'loading-screen';
      this.element.setAttribute('role', 'progressbar');
      this.element.setAttribute('aria-valuenow', '0');
      this.element.setAttribute('aria-valuemin', '0');
      this.element.setAttribute('aria-valuemax', '100');
      this.element.innerHTML = `
        <div class="loading-content">
          <div class="loading-title">IRON DUST</div>
          <div class="loading-progress-box">
            <div class="loading-bar-track">
              <div id="loading-bar-fill" class="loading-bar-fill"></div>
            </div>
            <div class="loading-meta">
              <span id="loading-stage" class="loading-stage">${this.texts.loading}</span>
              <span id="loading-percent" class="loading-percent">0%</span>
            </div>
          </div>
          <div class="loading-tip-container">
            <div id="loading-tip" class="loading-tip">${this.texts.tips[0]}</div>
          </div>
          <div id="loading-error" class="loading-error-box" hidden>
            <p id="loading-error-msg" class="loading-error-msg"></p>
            <button id="loading-retry" class="loading-retry-btn" type="button">${this.texts.retry}</button>
          </div>
        </div>
      `;
      document.body.prepend(this.element);
    }

    this.barFill = this.element.querySelector('#loading-bar-fill');
    this.stageText = this.element.querySelector('#loading-stage');
    this.percentText = this.element.querySelector('#loading-percent');
    this.tipText = this.element.querySelector('#loading-tip');
    this.errorBox = this.element.querySelector('#loading-error');
    this.errorMsg = this.element.querySelector('#loading-error-msg');
    this.retryBtn = this.element.querySelector('#loading-retry');

    if (this.stageText && !this.stageText.textContent) {
      this.stageText.textContent = this.texts.loading;
    }
    if (this.tipText && !this.tipText.textContent) {
      this.tipText.textContent = this.texts.tips[0];
    }
    if (this.retryBtn) {
      this.retryBtn.textContent = this.texts.retry;
      this.retryBtn.onclick = () => location.reload();
    }
  }

  private checkEnvironment() {
    if (!isWebGL2Available()) {
      console.error('[IRON DUST] WebGL 2.0 is not supported or disabled on this device/browser.');
      this.showError(this.texts.webglError, 'WebGL 2.0 context is unavailable.');
    }
  }

  public setLanguage(lang: LoadingLanguage) {
    this.language = lang;
    this.texts = LOADING_TEXTS[lang];
    if (this.retryBtn) this.retryBtn.textContent = this.texts.retry;
    if (this.tipText && !this.tipText.classList.contains('tip-fading')) {
      this.tipText.textContent = this.texts.tips[this.tipIndex % this.texts.tips.length];
    }
  }

  private startTipRotation() {
    if (this.tipTimer) clearInterval(this.tipTimer);
    this.tipTimer = setInterval(() => {
      if (this.completed || this.hasError || !this.tipText) return;
      this.tipText.classList.add('tip-fading');
      setTimeout(() => {
        if (!this.tipText) return;
        this.tipIndex = (this.tipIndex + 1) % this.texts.tips.length;
        this.tipText.textContent = this.texts.tips[this.tipIndex];
        this.tipText.classList.remove('tip-fading');
      }, 250);
    }, 3500);
  }

  public setProgress(pct: number, stageName?: string) {
    if (this.completed || this.hasError) return;
    const clamped = Math.max(this.progress, Math.min(100, Math.round(pct)));
    this.progress = clamped;

    if (this.element) {
      this.element.setAttribute('aria-valuenow', String(clamped));
    }
    if (this.barFill) {
      this.barFill.style.width = `${clamped}%`;
    }
    if (this.percentText) {
      this.percentText.textContent = `${clamped}%`;
    }
    if (stageName && this.stageText) {
      this.stageText.textContent = stageName;
    }

    if (clamped >= 100) {
      this.finish();
    }
  }

  private recalculateProgress() {
    if (this.completed || this.hasError) return;

    // Stage 1: Script chunks (0 - 25%)
    const scriptRatio = Math.min(1, this.scriptsLoaded / 12);
    const scriptContribution = scriptRatio * 25;

    // Stage 2: Havok WASM (25 - 55%)
    let wasmContribution = 0;
    if (this.wasmLoadedBytes > 0) {
      const wasmRatio = Math.min(1, this.wasmLoadedBytes / (this.wasmTotalBytes || 2094563));
      wasmContribution = wasmRatio * 30;
    }

    // Stage 3: GLB Models (55 - 85%)
    let glbContribution = 0;
    if (this.glbLoadedBytes > 0 && this.glbTotalBytes > 0) {
      const glbRatio = Math.min(1, this.glbLoadedBytes / this.glbTotalBytes);
      glbContribution = glbRatio * 30;
    }

    // Stage 4: Scene assembly weight (up to 95%)
    const sceneContribution = this.statusWeight;

    const estimated = Math.max(
      scriptContribution,
      scriptContribution * 0.5 + wasmContribution,
      25 + wasmContribution * 0.5 + glbContribution,
      sceneContribution
    );

    this.setProgress(Math.min(98, Math.round(estimated)));
  }

  private setupInterceptors() {
    if (typeof window === 'undefined') return;

    // 1. PerformanceObserver to detect real script/resource arrivals
    if ('PerformanceObserver' in window) {
      try {
        this.perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const name = entry.name.toLowerCase();
            if (name.includes('.js') || name.includes('.css') || name.includes('.ttf')) {
              this.scriptsLoaded++;
              this.recalculateProgress();
            }
          }
        });
        this.perfObserver.observe({ entryTypes: ['resource'] });
      } catch {
        // Fallback if resource observation is not permitted
      }
    }

    // 2. Intercept window.fetch for Havok WASM and streaming assets
    const self = this;
    const globalObj = window as unknown as { __ironDustFetchHooked?: boolean };
    if (!globalObj.__ironDustFetchHooked) {
      globalObj.__ironDustFetchHooked = true;
      const originalFetch = window.fetch;
      window.fetch = async function (...args: Parameters<typeof fetch>) {
        const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? '';
        try {
          const response = await originalFetch.apply(this, args);
          if (!response.ok && response.status >= 400 && !urlStr.includes('/takes/') && !urlStr.includes('/renders')) {
            console.error('[IRON DUST] Fetch failed:', response.status, urlStr);
            self.showError(self.texts.assetError, `HTTP ${response.status} loading ${urlStr}`);
            return response;
          }

          // Track Havok WASM or binary assets
          if (urlStr.includes('.wasm') || urlStr.includes('.glb')) {
            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : (urlStr.includes('.wasm') ? 2094563 : 1500000);
            if (urlStr.includes('.wasm')) self.wasmTotalBytes = totalBytes;

            if (response.body) {
              const reader = response.body.getReader();
              const stream = new ReadableStream({
                async start(controller) {
                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) {
                        controller.close();
                        break;
                      }
                      if (value) {
                        if (urlStr.includes('.wasm')) {
                          self.wasmLoadedBytes += value.byteLength;
                        } else {
                          self.glbLoadedBytes += value.byteLength;
                          if (!self.glbTotalBytes) self.glbTotalBytes = totalBytes;
                        }
                        self.recalculateProgress();
                        controller.enqueue(value);
                      }
                    }
                  } catch (streamErr) {
                    controller.error(streamErr);
                  }
                },
              });

              return new Response(stream, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }
          }

          return response;
        } catch (fetchErr) {
          if (!urlStr.includes('/takes/') && !urlStr.includes('/renders')) {
            console.error('[IRON DUST] Fetch network error:', fetchErr, urlStr);
            self.showError(self.texts.assetError, String(fetchErr));
          }
          throw fetchErr;
        }
      };
    }

    // 3. Intercept XMLHttpRequest for Babylon GLB loading
    const globalXhr = window as unknown as { __ironDustXhrHooked?: boolean };
    if (!globalXhr.__ironDustXhrHooked && typeof XMLHttpRequest !== 'undefined') {
      globalXhr.__ironDustXhrHooked = true;
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: any[]) {
        (this as any).__url = String(args[1]);
        return origOpen.apply(this, args as any);
      };

      XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: any[]) {
        const url: string = (this as any).__url || '';
        this.addEventListener('progress', (e: ProgressEvent) => {
          if (e.lengthComputable && e.total > 0) {
            self.glbLoadedBytes = Math.max(self.glbLoadedBytes, e.loaded);
            self.glbTotalBytes = Math.max(self.glbTotalBytes, e.total);
            self.recalculateProgress();
          }
        });

        this.addEventListener('load', () => {
          if (this.status >= 400) {
            console.error('[IRON DUST] XHR failed with status:', this.status, url);
            self.showError(self.texts.assetError, `XHR ${this.status} loading ${url}`);
          }
        });

        this.addEventListener('error', (err) => {
          console.error('[IRON DUST] XHR network error:', err, url);
          self.showError(self.texts.assetError, `Failed to load ${url}`);
        });

        return origSend.apply(this, args as any);
      };
    }

    // 4. Global resource error monitoring
    window.addEventListener(
      'error',
      (event) => {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG')) {
          const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href;
          console.error('[IRON DUST] Asset load error on element:', src);
          this.showError(this.texts.assetError, `Resource failed: ${src}`);
        }
      },
      true
    );
  }

  private observeStatus() {
    const checkStatus = () => {
      const statusEl = document.querySelector<HTMLElement>('#status');
      if (!statusEl) return;

      const onStatusChange = () => {
        if (this.hasError) return;
        const isHidden = statusEl.hidden;
        const text = statusEl.textContent?.trim() || '';

        // If status element reports loadError
        if (text.includes('hata') || text.includes('Error') || text.includes('failed')) {
          this.showError(this.texts.assetError, text);
          return;
        }

        if (isHidden) {
          // Babylon scene has finished loading!
          this.finish();
        } else {
          // Status became visible during game lifecycle (e.g. restart or mission transition)
          if (this.completed) {
            this.showMissionTransition(text);
          } else {
            // Update stage weight
            if (text.includes('Tank')) this.statusWeight = 70;
            else if (text.includes('Rakip') || text.includes('Opponent')) this.statusWeight = 82;
            else if (text.includes('Takım') || text.includes('Team')) this.statusWeight = 90;
            this.recalculateProgress();
          }
        }
      };

      this.statusObserver = new MutationObserver(() => onStatusChange());
      this.statusObserver.observe(statusEl, {
        attributes: true,
        attributeFilter: ['hidden', 'style', 'class'],
        childList: true,
        characterData: true,
        subtree: true,
      });

      // Initial inspection
      if (statusEl.hidden) {
        this.finish();
      } else {
        onStatusChange();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkStatus);
    } else {
      checkStatus();
    }
  }

  public showMissionTransition(message?: string) {
    if (!this.element || this.hasError) return;
    this.completed = false;
    this.isMissionMode = true;
    this.progress = 20;

    this.element.hidden = false;
    this.element.style.display = 'flex';
    this.element.classList.remove('loading-hidden');
    this.element.classList.add('loading-mission-mode');

    if (this.barFill) this.barFill.style.width = '20%';
    if (this.percentText) this.percentText.textContent = '20%';
    if (this.stageText) this.stageText.textContent = message || this.texts.preparingMission;

    this.startTipRotation();
  }

  public finish() {
    if (this.completed || this.hasError) return;
    this.completed = true;
    this.setProgress(100, this.language === 'en' ? 'Ready' : 'Hazır');

    if (this.tipTimer) {
      clearInterval(this.tipTimer);
      this.tipTimer = null;
    }

    setTimeout(() => {
      if (!this.element) return;
      this.element.classList.add('loading-hidden');
      setTimeout(() => {
        if (this.element && this.completed) {
          this.element.hidden = true;
          this.element.style.display = 'none';
          this.element.classList.remove('loading-mission-mode');
        }
      }, 400);
    }, 150);
  }

  public showError(userMessage: string, technicalDetail?: unknown) {
    this.hasError = true;
    if (technicalDetail) {
      console.error('[IRON DUST Loading Failure]:', technicalDetail);
    }
    if (this.tipTimer) {
      clearInterval(this.tipTimer);
      this.tipTimer = null;
    }

    if (this.element) {
      this.element.hidden = false;
      this.element.style.display = 'flex';
      this.element.classList.remove('loading-hidden');
    }

    const progressBox = this.element?.querySelector<HTMLElement>('.loading-progress-box');
    const tipContainer = this.element?.querySelector<HTMLElement>('.loading-tip-container');
    if (progressBox) progressBox.style.display = 'none';
    if (tipContainer) tipContainer.style.display = 'none';

    if (this.errorBox && this.errorMsg) {
      this.errorMsg.textContent = userMessage;
      this.errorBox.hidden = false;
    }
  }

  public dispose() {
    if (this.tipTimer) {
      clearInterval(this.tipTimer);
      this.tipTimer = null;
    }
    if (this.statusObserver) {
      this.statusObserver.disconnect();
      this.statusObserver = null;
    }
    if (this.perfObserver) {
      this.perfObserver.disconnect();
      this.perfObserver = null;
    }
  }
}

// Global auto-instantiation in browser
export const globalLoadingScreen = typeof window !== 'undefined' ? new LoadingScreen() : null;
