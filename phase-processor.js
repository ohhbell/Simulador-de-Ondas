class PhaseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.wave1 = { active: true, type: 'sine', freq: 440, amp: 0.7, phase: 0, currentPhase: 0 };
    this.wave2 = { active: true, type: 'sine', freq: 440, amp: 0.7, phase: 0, currentPhase: 0 };

    this.port.onmessage = (event) => {
      this.wave1 = { ...this.wave1, ...event.data.wave1, currentPhase: 0 };
      this.wave2 = { ...this.wave2, ...event.data.wave2, currentPhase: 0 };
    };
  }

  getSample(type, phase) {
    switch (type) {
      case 'sine':
        return Math.sin(phase);
      case 'square':
        return Math.sin(phase) > 0 ? 1 : -1;
      case 'triangle':
        return (2 / Math.PI) * Math.asin(Math.sin(phase));
      case 'sawtooth':
        return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
      default:
        return 0;
    }
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const outputChannel = output[0];
    
    if (!outputChannel) {
        return true;
    }

    const wave1PhaseIncrement = (2 * Math.PI * this.wave1.freq) / sampleRate;
    const wave2PhaseIncrement = (2 * Math.PI * this.wave2.freq) / sampleRate;

    for (let i = 0; i < outputChannel.length; i++) {
      let sample1 = 0;
      let sample2 = 0;

      if (this.wave1.active) {
        sample1 = this.getSample(this.wave1.type, this.wave1.currentPhase + this.wave1.phase) * this.wave1.amp;
        this.wave1.currentPhase += wave1PhaseIncrement;
      }
      
      if (this.wave2.active) {
        sample2 = this.getSample(this.wave2.type, this.wave2.currentPhase + this.wave2.phase) * this.wave2.amp;
        this.wave2.currentPhase += wave2PhaseIncrement;
      }
      
      outputChannel[i] = (sample1 + sample2) * 0.5;

      // Limita a fase para evitar valores muito grandes
      if (this.wave1.currentPhase > 2 * Math.PI) this.wave1.currentPhase -= 2 * Math.PI;
      if (this.wave2.currentPhase > 2 * Math.PI) this.wave2.currentPhase -= 2 * Math.PI;
    }

    return true;
  }
}

registerProcessor('phase-processor', PhaseProcessor);