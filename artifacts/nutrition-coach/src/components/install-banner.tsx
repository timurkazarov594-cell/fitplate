import { useEffect, useState } from "react";

const DISMISS_KEY = "pwa_install_banner_dismissed";

type Platform = "ios-safari" | "android-chrome";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform | null {
  const ua = window.navigator.userAgent;

  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (isIOSSafari) return "ios-safari";

  const isAndroid = /Android/.test(ua);
  const isAndroidChrome = isAndroid && /Chrome/.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua);
  if (isAndroidChrome) return "android-chrome";

  return null;
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari exposes this non-standard flag instead of display-mode.
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

function ShareIcon() {
  return (
    <svg className="w-4 h-4 inline-block align-text-bottom mx-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0-12l-3.5 3.5M12 3l3.5 3.5M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function MenuDotsIcon() {
  return (
    <svg className="w-4 h-4 inline-block align-text-bottom mx-0.5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

export function InstallBanner() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    const detected = detectPlatform();
    if (!detected) return;
    setPlatform(detected);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (platform !== "android-chrome") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [platform]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible || !platform) return null;

  return (
    <div className="relative flex items-center gap-3 bg-background border-b border-primary/20 px-4 py-2.5 text-sm text-foreground">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
      </div>

      <p className="flex-1 min-w-0 leading-snug">
        {platform === "ios-safari" && (
          <>
            Нажмите кнопку «Поделиться» <ShareIcon /> внизу экрана, затем «На экран «Домой»»
          </>
        )}
        {platform === "android-chrome" && deferredPrompt && (
          <>Установите приложение на телефон — быстрый доступ с главного экрана</>
        )}
        {platform === "android-chrome" && !deferredPrompt && (
          <>
            Нажмите на меню <MenuDotsIcon /> в браузере, затем «Добавить на главный экран»
          </>
        )}
      </p>

      {platform === "android-chrome" && deferredPrompt && (
        <button
          onClick={handleInstallClick}
          className="flex-shrink-0 rounded-lg bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 hover:opacity-90 transition-opacity"
        >
          Установить
        </button>
      )}

      <button
        onClick={dismiss}
        aria-label="Закрыть"
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
