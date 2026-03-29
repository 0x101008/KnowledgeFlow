class AudioEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(frequency: number, type: OscillatorType, duration: number, vol = 0.1) {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }

  playClick() {
    this.playTone(600, 'sine', 0.1, 0.05);
  }

  playSuccess() {
    this.playTone(880, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1108.73, 'sine', 0.2, 0.1), 100);
  }

  playError() {
    this.playTone(300, 'sawtooth', 0.2, 0.1);
    setTimeout(() => this.playTone(250, 'sawtooth', 0.3, 0.1), 150);
  }

  playUnlock() {
    this.playTone(523.25, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(783.99, 'sine', 0.1, 0.1), 200);
    setTimeout(() => this.playTone(1046.50, 'sine', 0.3, 0.1), 300);
  }
}

export const audio = new AudioEngine();
