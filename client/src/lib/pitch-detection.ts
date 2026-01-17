const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_FREQUENCIES: { [key: string]: number } = {
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
  'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
  'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50,
};

export interface PitchResult {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  confidence: number;
}

export function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  
  if (frequency <= 0) {
    return { note: '', octave: 0, cents: 0 };
  }
  
  const halfSteps = Math.round(12 * Math.log2(frequency / C0));
  const octave = Math.floor(halfSteps / 12);
  const noteIndex = halfSteps % 12;
  const note = NOTE_NAMES[noteIndex];
  
  const exactNote = C0 * Math.pow(2, halfSteps / 12);
  const cents = Math.round(1200 * Math.log2(frequency / exactNote));
  
  return { note, octave, cents };
}

export function noteToString(note: string, octave: number): string {
  return `${note}${octave}`;
}

export function getVoiceType(lowestNote: string, highestNote: string): string {
  const noteOrder = Object.keys(NOTE_FREQUENCIES);
  const lowIndex = noteOrder.indexOf(lowestNote);
  const highIndex = noteOrder.indexOf(highestNote);
  
  if (lowIndex === -1 || highIndex === -1) {
    return 'Unknown';
  }
  
  const c3Index = noteOrder.indexOf('C3');
  const e3Index = noteOrder.indexOf('E3');
  const a3Index = noteOrder.indexOf('A3');
  const c4Index = noteOrder.indexOf('C4');
  const e4Index = noteOrder.indexOf('E4');
  
  if (lowIndex <= c3Index && highIndex >= c4Index) {
    if (lowIndex <= noteOrder.indexOf('E2')) {
      return 'Bass';
    } else if (lowIndex <= noteOrder.indexOf('A2')) {
      return 'Baritone';
    } else if (lowIndex <= e3Index) {
      return 'Tenor';
    }
  }
  
  if (lowIndex >= a3Index) {
    if (highIndex >= noteOrder.indexOf('C6')) {
      return 'Soprano';
    } else if (highIndex >= noteOrder.indexOf('A5')) {
      return 'Mezzo-Soprano';
    } else {
      return 'Alto';
    }
  }
  
  if (lowIndex <= e3Index && highIndex <= noteOrder.indexOf('G4')) {
    return 'Baritone';
  }
  
  if (lowIndex <= c3Index) {
    return 'Bass-Baritone';
  }
  
  return 'Tenor';
}

export function getSuggestedKeys(lowestNote: string, highestNote: string): string[] {
  const noteOrder = Object.keys(NOTE_FREQUENCIES);
  const lowIndex = noteOrder.indexOf(lowestNote);
  const highIndex = noteOrder.indexOf(highestNote);
  
  if (lowIndex === -1 || highIndex === -1) {
    return ['C', 'G', 'D'];
  }
  
  const range = highIndex - lowIndex;
  const midIndex = lowIndex + Math.floor(range / 2);
  const midNote = noteOrder[midIndex];
  const baseNote = midNote?.replace(/\d/, '') || 'C';
  
  const keyOptions = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const baseIndex = keyOptions.indexOf(baseNote.replace('#', ''));
  
  const suggested = [];
  suggested.push(keyOptions[baseIndex] || 'C');
  suggested.push(keyOptions[(baseIndex + 5) % 7]);
  suggested.push(keyOptions[(baseIndex + 7) % 7]);
  
  return Array.from(new Set(suggested)).slice(0, 3);
}

export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) {
    return -1;
  }

  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2;

  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  const buf = buffer.slice(r1, r2);
  const c = new Array(buf.length).fill(0);

  for (let i = 0; i < buf.length; i++) {
    for (let j = 0; j < buf.length - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) {
    d++;
  }

  let maxVal = -1;
  let maxPos = -1;

  for (let i = d; i < buf.length; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }

  let t0 = maxPos;

  const x1 = c[t0 - 1];
  const x2 = c[t0];
  const x3 = c[t0 + 1];

  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;

  if (a) {
    t0 -= b / (2 * a);
  }

  return sampleRate / t0;
}

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private buffer: Float32Array | null = null;
  private isRunning = false;
  private onPitch: ((result: PitchResult | null) => void) | null = null;
  private animationId: number | null = null;

  async start(deviceId?: string, onPitch?: (result: PitchResult | null) => void): Promise<void> {
    this.onPitch = onPitch || null;
    
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    };
    
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.isRunning = true;
    
    this.detectPitch();
  }

  private detectPitch(): void {
    if (!this.isRunning || !this.analyser || !this.buffer) {
      return;
    }

    this.analyser.getFloatTimeDomainData(this.buffer);
    const frequency = autoCorrelate(this.buffer, this.audioContext!.sampleRate);

    if (frequency > 0 && frequency < 2000) {
      const { note, octave, cents } = frequencyToNote(frequency);
      
      let rms = 0;
      for (let i = 0; i < this.buffer.length; i++) {
        rms += this.buffer[i] * this.buffer[i];
      }
      rms = Math.sqrt(rms / this.buffer.length);
      const confidence = Math.min(rms * 10, 1);

      if (this.onPitch) {
        this.onPitch({
          frequency,
          note,
          octave,
          cents,
          confidence,
        });
      }
    } else if (this.onPitch) {
      this.onPitch(null);
    }

    this.animationId = requestAnimationFrame(() => this.detectPitch());
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.buffer = null;
    this.onPitch = null;
  }
}
