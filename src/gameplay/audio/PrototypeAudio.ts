import type { Judgement } from "../domain/types";
import { BEAT_SECONDS, STAGE_DURATION_SECONDS } from "../domain/chart";

export class PrototypeAudio {
  private context: AudioContext | null = null;
  private stageStartTime = 0;
  private readonly sources = new Set<OscillatorNode>();

  async start(): Promise<void> {
    this.stopScheduledSources();
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
    this.stageStartTime = this.context.currentTime + 0.08;
    this.scheduleMetronome();
  }

  getSongTime(): number {
    if (!this.context || this.stageStartTime === 0) return 0;
    return Math.max(0, this.context.currentTime - this.stageStartTime);
  }

  scheduleMetronome(): void {
    if (!this.context) return;
    const beatCount = Math.ceil(STAGE_DURATION_SECONDS / BEAT_SECONDS);
    for (let beat = 0; beat < beatCount; beat += 1) {
      const accented = beat % 4 === 0;
      this.scheduleTone(
        this.stageStartTime + beat * BEAT_SECONDS,
        accented ? 720 : 440,
        accented ? 0.055 : 0.035,
        0.045,
        "sine",
      );
    }
  }

  playRushCue(): void {
    if (!this.context) return;
    this.scheduleTone(this.context.currentTime, 1160, 0.08, 0.09, "triangle");
  }

  playJudgement(judgement: Judgement): void {
    if (!this.context) return;
    const frequency = judgement === "perfect" ? 980 : judgement === "good" ? 720 : 180;
    const wave: OscillatorType = judgement === "miss" ? "sawtooth" : "sine";
    this.scheduleTone(this.context.currentTime, frequency, judgement === "miss" ? 0.07 : 0.09, 0.11, wave);
  }

  destroy(): void {
    this.stopScheduledSources();
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = null;
    this.stageStartTime = 0;
  }

  private scheduleTone(
    startTime: number,
    frequency: number,
    volume: number,
    duration: number,
    wave: OscillatorType,
  ): void {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.addEventListener("ended", () => {
      this.sources.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    });
    this.sources.add(oscillator);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.01);
  }

  private stopScheduledSources(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Already-ended Web Audio sources cannot be stopped twice.
      }
      source.disconnect();
    }
    this.sources.clear();
  }
}
