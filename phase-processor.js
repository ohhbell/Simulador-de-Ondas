class PhaseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Parâmetros da onda 1
    this.wave1 = { 
        active: true, 
        type: 'sine', 
        freq: 440, 
        amp: 0.7, 
        phase: 0, 
        currentPhase: 0, 
        targetPhase: 0,
        phaseRamp: 0
    };
    // Parâmetros da onda 2
    this.wave2 = { 
        active: true, 
        type: 'sine', 
        freq: 440, 
        amp: 0.7, 
        phase: 0, 
        currentPhase: 0, 
        targetPhase: 0,
        phaseRamp: 0
    };

    // Tempo de rampa para suavizar mudanças de parâmetro (em segundos)
    this.rampTime = 0.05; 

    this.port.onmessage = (event) => {
      // Recebe os novos parâmetros
      const newWave1Params = event.data.wave1;
      const newWave2Params = event.data.wave2;
      
      // Calcula o valor da rampa para a fase
      const rampSamples = Math.ceil(this.rampTime * sampleRate);
      
      const wave1PhaseDifference = newWave1Params.phase - this.wave1.phase;
      this.wave1.phaseRamp = wave1PhaseDifference / rampSamples;
      this.wave1.targetPhase = newWave1Params.phase;

      const wave2PhaseDifference = newWave2Params.phase - this.wave2.phase;
      this.wave2.phaseRamp = wave2PhaseDifference / rampSamples;
      this.wave2.targetPhase = newWave2Params.phase;
      
      // Atualiza os outros parâmetros instantaneamente
      this.wave1.active = newWave1Params.active;
      this.wave1.type = newWave1Params.type;
      this.wave1.freq = newWave1Params.freq;
      this.wave1.amp = newWave1Params.amp;
      
      this.wave2.active = newWave2Params.active;
      this.wave2.type = newWave2Params.type;
      this.wave2.freq = newWave2Params.freq;
      this.wave2.amp = newWave2Params.amp;

      // Resetar a fase se a frequência mudar para evitar saltos.
      if (newWave1Params.freq !== this.wave1.freq) this.wave1.currentPhase = 0;
      if (newWave2Params.freq !== this.wave2.freq) this.wave2.currentPhase = 0;
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
      // Suaviza a fase da onda 1
      if (Math.abs(this.wave1.phase - this.wave1.targetPhase) > Math.abs(this.wave1.phaseRamp)) {
          this.wave1.phase += this.wave1.phaseRamp;
      } else {
          this.wave1.phase = this.wave1.targetPhase;
      }
      
      // Suaviza a fase da onda 2
      if (Math.abs(this.wave2.phase - this.wave2.targetPhase) > Math.abs(this.wave2.phaseRamp)) {
          this.wave2.phase += this.wave2.phaseRamp;
      } else {
          this.wave2.phase = this.wave2.targetPhase;
      }

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