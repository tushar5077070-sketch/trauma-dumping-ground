// Procedural Web Audio API Soundscape for Trauma Dumping Ground
// Generates gentle meadow breeze and soft pentatonic wind chimes without external audio files

class MeadowSoundscape {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private chimeInterval: number | null = null;
  private lfoInterval: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    if (this.isPlaying) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      this.isPlaying = true;

      // Create pink/white noise buffer for soft summer breeze
      const bufferSize = this.ctx.sampleRate * 4;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.025;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
      this.windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.windGain.gain.exponentialRampToValueAtTime(0.09, this.ctx.currentTime + 2.5);

      whiteNoise.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);
      whiteNoise.start(0);

      // Modulate breeze filter frequency smoothly like natural wind gusts
      this.lfoInterval = window.setInterval(() => {
        if (!this.ctx || !this.windFilter || !this.isPlaying) return;
        const nextFreq = 260 + Math.random() * 280;
        this.windFilter.frequency.exponentialRampToValueAtTime(
          nextFreq,
          this.ctx.currentTime + 3.8
        );
      }, 4000);

      // Occasional soft distant harmonic wind chime
      this.chimeInterval = window.setInterval(() => {
        if (this.isPlaying && Math.random() > 0.35) {
          this.playGentleNote(0.03);
        }
      }, 4500);

      this.playGentleNote(0.04);
    } catch {
      this.isPlaying = false;
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.lfoInterval) {
      clearInterval(this.lfoInterval);
      this.lfoInterval = null;
    }
    if (this.chimeInterval) {
      clearInterval(this.chimeInterval);
      this.chimeInterval = null;
    }
    if (this.ctx && this.windGain) {
      try {
        this.windGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
        setTimeout(() => {
          this.ctx?.suspend();
        }, 850);
      } catch {
        // Ignore audio context state errors
      }
    }
  }

  public playHoverChime() {
    if (!this.isPlaying) return;
    this.playGentleNote(0.022);
  }

  public playBloomChord() {
    if (!this.isPlaying) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playSpecificFreq(freq, 0.045, 2.8);
      }, idx * 140);
    });
  }

  private playGentleNote(volume = 0.03) {
    // Fmaj9 / Cmaj7 pentatonic frequencies
    const scale = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
    const freq = scale[Math.floor(Math.random() * scale.length)];
    this.playSpecificFreq(freq, volume, 3.2);
  }

  private playSpecificFreq(freq: number, volume: number, duration: number) {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.05);
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundscape = new MeadowSoundscape();
