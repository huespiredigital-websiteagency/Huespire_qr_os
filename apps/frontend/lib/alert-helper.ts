// Sound Player and Browser Notification Utility using Web Audio API
import { apiClient } from "./api-client";

class SoundPlayer {
  private ctx: AudioContext | null = null;
  private volume: number = 0.65; // 60-70% volume

  init() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  playKitchenBeep() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Tone 1: 880Hz (A5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, t);
      gain1.gain.setValueAtTime(this.volume, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.25);

      // Tone 2: 1200Hz (D6-ish)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1200, t + 0.12);
      gain2.gain.setValueAtTime(this.volume, t + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.12 + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.12);
      osc2.stop(t + 0.12 + 0.25);
    } catch (err) {
      console.warn("[SoundPlayer] Playback blocked or failed:", err);
    }
  }

  playWaiterChime() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Chime: 523.25Hz (C5), 659.25Hz (E5), 783.99Hz (G5) in arpeggio
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();
        
        const noteTime = t + idx * 0.08;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteTime);
        gainNode.gain.setValueAtTime(this.volume * 0.7, noteTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.35);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx!.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    } catch (err) {
      console.warn("[SoundPlayer] Playback blocked or failed:", err);
    }
  }
}

export const soundPlayer = new SoundPlayer();

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

// Show native browser notification
export const showBrowserNotification = (title: string, body: string) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico"
    });
  } catch (err) {
    console.error("Failed to show browser notification", err);
  }
};

// Register Service Worker
export const registerServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("[Service Worker] Registered successfully:", reg.scope);
    return reg;
  } catch (err) {
    console.error("[Service Worker] Registration failed:", err);
    return null;
  }
};

// Subscribe to push notifications
export const subscribeUserToPush = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    // Ensure service worker is registered
    const registration = await registerServiceWorker();
    if (!registration) return;

    const readyRegistration = await navigator.serviceWorker.ready;
    if (!readyRegistration.pushManager) {
      console.warn("[Push] PushManager not supported.");
      return;
    }

    let subscription = await readyRegistration.pushManager.getSubscription();
    if (!subscription) {
      const publicVapidKey = "BLMyuWbIgcWmOVdZNt9IE8Ut5ndE4-PIlgzJkmNFudIYv98XeE0nD06F49jnmmf0j1erzCnon1J2HVVL7Nk_naw";
      const convertedKey = urlBase64ToUint8Array(publicVapidKey);

      subscription = await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // Send subscription to backend
    await apiClient.post("/notifications/subscribe", { subscription });
    console.log("[Push] Registered push subscription on backend.");
  } catch (err) {
    console.error("[Push] Subscription failed:", err);
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
