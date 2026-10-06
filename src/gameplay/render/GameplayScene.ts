import Phaser from "phaser";
import { PrototypeAudio } from "../audio/PrototypeAudio";
import { STAGE_CHART, STAGE_DURATION_SECONDS } from "../domain/chart";
import { RhythmSession, type InputOutcome, type SessionSnapshot } from "../domain/RhythmSession";
import type { HoldRhythmEvent, Judgement, RhythmEvent } from "../domain/types";
import { GAMEPLAY_ASSETS } from "./assetManifest";
import { eventProgress, GAME_HEIGHT, GAME_WIDTH, HIT_POINT, perspectivePoint, SPAWN_POINT } from "./motion";

interface GameplaySceneCallbacks {
  onReady: (scene: GameplayScene) => void;
  onSnapshot: (snapshot: SessionSnapshot) => void;
}

const COLORS = {
  sky: 0x160c2c,
  floor: 0x29144c,
  marker: 0xa788ff,
  target: 0xffd84c,
  normal: 0xffd84c,
  rush: 0xff668f,
  hold: 0x65e6dd,
  piko: 0x9fd9ff,
  outline: 0xffffff,
};

export class GameplayScene extends Phaser.Scene {
  private readonly callbacks: GameplaySceneCallbacks;
  private readonly session = new RhythmSession(STAGE_CHART, STAGE_DURATION_SECONDS);
  private readonly audio = new PrototypeAudio();
  private staticLayer!: Phaser.GameObjects.Graphics;
  private playLayer!: Phaser.GameObjects.Graphics;
  private started = false;
  private lastSnapshotAt = -1;
  private lastEmittedStatus: SessionSnapshot["status"] | null = null;
  private feedbackUntil = 0;
  private lastFeedback: Judgement | null = null;
  private readonly playedRushCues = new Set<string>();

  constructor(callbacks: GameplaySceneCallbacks) {
    super({ key: "candy-chase-gameplay" });
    this.callbacks = callbacks;
  }

  create(): void {
    this.staticLayer = this.add.graphics();
    this.playLayer = this.add.graphics();
    this.staticLayer.setName(GAMEPLAY_ASSETS.pikoIdle);
    this.playLayer.setName(GAMEPLAY_ASSETS.hitPoint);
    this.drawStaticScene();

    this.input.keyboard?.on("keydown-SPACE", (event: KeyboardEvent) => {
      if (!event.repeat) this.handlePress();
    });
    this.input.keyboard?.on("keyup-SPACE", () => this.handleRelease());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() || pointer.button === 0) this.handlePress();
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.handleRelease();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
    this.callbacks.onReady(this);
    this.emitSnapshot();
  }

  update(): void {
    const songTime = this.started ? this.audio.getSongTime() : 0;
    if (this.started) {
      this.session.advance(songTime);
      this.triggerRushCues(songTime);
    }
    this.drawPlayfield(songTime);

    const snapshot = this.session.snapshot();
    if (songTime - this.lastSnapshotAt >= 0.05 || snapshot.status !== this.lastEmittedStatus) {
      this.emitSnapshot(snapshot);
      this.lastSnapshotAt = songTime;
    }
  }

  async startStage(): Promise<void> {
    this.session.restart();
    this.playedRushCues.clear();
    this.feedbackUntil = 0;
    this.lastFeedback = null;
    await this.audio.start();
    this.started = true;
    this.lastSnapshotAt = -1;
    this.emitSnapshot();
  }

  private handlePress(): void {
    if (!this.started || this.session.snapshot().status === "complete") return;
    const outcome = this.session.press(this.audio.getSongTime());
    this.handleOutcome(outcome);
  }

  private handleRelease(): void {
    if (!this.started || this.session.snapshot().status === "complete") return;
    const outcome = this.session.release(this.audio.getSongTime());
    this.handleOutcome(outcome);
  }

  private handleOutcome(outcome: InputOutcome): void {
    if (outcome.kind === "judged" || outcome.kind === "hold-start") {
      this.audio.playJudgement(outcome.judgement);
      this.lastFeedback = outcome.judgement;
      this.feedbackUntil = this.audio.getSongTime() + 0.22;
    } else if (outcome.kind === "empty") {
      this.lastFeedback = null;
    }
    this.emitSnapshot();
  }

  private triggerRushCues(songTime: number): void {
    for (const event of STAGE_CHART) {
      if (event.type !== "rush" || this.playedRushCues.has(event.id)) continue;
      if (songTime >= event.hitTime - 1 && songTime < event.hitTime) {
        this.playedRushCues.add(event.id);
        this.audio.playRushCue();
      }
    }
  }

  private drawStaticScene(): void {
    const graphics = this.staticLayer;
    graphics.clear();
    graphics.fillStyle(COLORS.sky, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(COLORS.floor, 1).fillRect(0, GAME_HEIGHT * 0.58, GAME_WIDTH, GAME_HEIGHT * 0.42);

    graphics.fillStyle(0x3e2270, 0.5).fillCircle(SPAWN_POINT.x, SPAWN_POINT.y, 118);
    graphics.lineStyle(10, 0xd7c4ff, 0.2).strokeCircle(SPAWN_POINT.x, SPAWN_POINT.y, 82);
    graphics.fillStyle(0xffffff, 0.75).fillCircle(SPAWN_POINT.x, SPAWN_POINT.y, 12);

    for (const progress of [0.22, 0.48, 0.73]) {
      const point = perspectivePoint(progress);
      graphics.lineStyle(8 * point.scale, COLORS.marker, 0.24 + progress * 0.12);
      graphics.strokeEllipse(point.x, point.y, 145 * point.scale, 46 * point.scale);
    }

    this.drawPiko(graphics, GAME_WIDTH * 0.21, GAME_HEIGHT * 0.67);
  }

  private drawPiko(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.fillStyle(0x10233d, 1).fillEllipse(x, y, 245, 330);
    graphics.fillStyle(COLORS.piko, 1).fillEllipse(x, y - 20, 190, 250);
    graphics.fillStyle(0xffffff, 1).fillEllipse(x, y + 20, 125, 160);
    graphics.fillStyle(0x17233f, 1).fillCircle(x - 38, y - 83, 13).fillCircle(x + 38, y - 83, 13);
    graphics.fillStyle(0xffc34f, 1).fillTriangle(x - 18, y - 50, x + 46, y - 50, x + 5, y - 18);
    graphics.fillStyle(0xff6a8d, 1).fillRoundedRect(x + 45, y - 15, 155, 52, 22);
    graphics.fillStyle(0xffd34d, 1).fillCircle(x + 78, y + 11, 68);
    graphics.lineStyle(16, 0xffffff, 0.85).lineBetween(x + 120, y + 11, HIT_POINT.x - 35, HIT_POINT.y - 35);
  }

  private drawPlayfield(songTime: number): void {
    const graphics = this.playLayer;
    graphics.clear();
    const snapshot = this.session.snapshot();
    const resolved = new Set(snapshot.resolvedEventIds);

    const nextEvent = STAGE_CHART.find((event) => !resolved.has(event.id) && event.hitTime >= songTime - 0.18);
    const approach = nextEvent ? Phaser.Math.Clamp(1 - (nextEvent.hitTime - songTime) / 0.5, 0, 1) : 0;
    const feedbackActive = songTime <= this.feedbackUntil;
    const targetAlpha = feedbackActive ? 1 : 0.3 + approach * 0.55;
    const targetRadius = feedbackActive ? 86 : 62 + approach * 12;
    graphics.fillStyle(COLORS.target, targetAlpha * 0.22).fillCircle(HIT_POINT.x, HIT_POINT.y, targetRadius + 34);
    graphics.lineStyle(12, COLORS.target, targetAlpha).strokeCircle(HIT_POINT.x, HIT_POINT.y, targetRadius);
    this.drawStar(graphics, HIT_POINT.x, HIT_POINT.y, 32, 15, COLORS.target, targetAlpha);

    const visible = STAGE_CHART
      .filter((event) => !resolved.has(event.id))
      .filter((event) => songTime >= event.hitTime - event.travelSeconds)
      .filter((event) => songTime <= (event.type === "hold" ? event.endTime : event.hitTime) + 0.18)
      .sort((first, second) => first.hitTime - second.hitTime)
      .slice(0, 3)
      .sort((first, second) => eventProgress(first, songTime) - eventProgress(second, songTime));

    for (const event of visible) this.drawCandy(graphics, event, songTime, snapshot.activeHoldId === event.id);

    if (feedbackActive && this.lastFeedback) {
      const color = this.lastFeedback === "perfect" ? 0xffef6b : this.lastFeedback === "good" ? 0x75f0d4 : 0xff5d89;
      graphics.lineStyle(18, color, 0.8).lineBetween(GAME_WIDTH * 0.31, GAME_HEIGHT * 0.66, HIT_POINT.x, HIT_POINT.y);
      graphics.fillStyle(color, 0.38).fillCircle(HIT_POINT.x, HIT_POINT.y, 120);
    }
  }

  private drawCandy(
    graphics: Phaser.GameObjects.Graphics,
    event: RhythmEvent,
    songTime: number,
    activeHold: boolean,
  ): void {
    const head = perspectivePoint(eventProgress(event, songTime));
    const cueActive = event.type === "rush" && songTime >= event.hitTime - 1 && songTime < event.hitTime;

    if (event.type === "hold") {
      this.drawHoldCandy(graphics, event, songTime, activeHold, head);
      return;
    }

    if (event.type === "rush") {
      graphics.lineStyle(24 * head.scale, COLORS.rush, cueActive ? 0.78 : 0.42);
      graphics.lineBetween(head.x + 58 * head.scale, head.y - 45 * head.scale, head.x + 150 * head.scale, head.y - 105 * head.scale);
      graphics.fillStyle(COLORS.rush, 0.9).fillTriangle(
        head.x - 48 * head.scale,
        head.y + 38 * head.scale,
        head.x,
        head.y - 62 * head.scale,
        head.x + 58 * head.scale,
        head.y + 42 * head.scale,
      );
      if (cueActive) graphics.lineStyle(10, 0xffffff, 0.8).strokeCircle(head.x, head.y, 78 * head.scale);
      return;
    }

    this.drawStar(graphics, head.x, head.y, 70 * head.scale, 34 * head.scale, COLORS.normal, 1);
  }

  private drawHoldCandy(
    graphics: Phaser.GameObjects.Graphics,
    event: HoldRhythmEvent,
    songTime: number,
    activeHold: boolean,
    head: { x: number; y: number; scale: number },
  ): void {
    const tailSpawnTime = event.endTime - event.travelSeconds;
    if (songTime >= tailSpawnTime) {
      const tailEvent: RhythmEvent = {
        id: `${event.id}-tail`,
        type: "normal",
        hitTime: event.endTime,
        travelSeconds: event.travelSeconds,
      };
      const tail = perspectivePoint(eventProgress(tailEvent, songTime));
      graphics.lineStyle(54 * Math.max(tail.scale, 0.45), COLORS.hold, activeHold ? 0.95 : 0.72);
      graphics.lineBetween(tail.x, tail.y, head.x, head.y);
      graphics.fillStyle(COLORS.hold, 1).fillCircle(tail.x, tail.y, 34 * tail.scale);
    }
    graphics.fillStyle(COLORS.hold, 1).fillCircle(head.x, head.y, 52 * head.scale);
    graphics.lineStyle(10 * head.scale, COLORS.outline, 0.8).strokeCircle(head.x, head.y, 52 * head.scale);
  }

  private drawStar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    outerRadius: number,
    innerRadius: number,
    color: number,
    alpha: number,
  ): void {
    const points: Phaser.Math.Vector2[] = [];
    for (let index = 0; index < 10; index += 1) {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      points.push(new Phaser.Math.Vector2(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
    }
    graphics.fillStyle(color, alpha).fillPoints(points, true);
  }

  private emitSnapshot(snapshot = this.session.snapshot()): void {
    this.lastEmittedStatus = snapshot.status;
    this.callbacks.onSnapshot(snapshot);
  }
}
