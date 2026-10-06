import { describe, expect, it } from "vitest";
import { isCurrentGameMessage } from "./bridge";

const origin = "https://game.example";
const runId = 7;
const frameWindow = window;
const ready = { type: "rhythmgame:ready", runId };

function message(data: unknown, options: MessageEventInit = {}) {
  return new MessageEvent("message", { data, origin, source: frameWindow, ...options });
}

describe("isCurrentGameMessage", () => {
  it("accepts the current iframe, explicit origin and integer run id", () => {
    expect(isCurrentGameMessage(message(ready), frameWindow, origin, runId)).toBe(true);
    expect(isCurrentGameMessage(message({ type: "rhythmgame:complete", runId, result: {} }), frameWindow, origin, runId)).toBe(true);
    expect(isCurrentGameMessage(message({ type: "rhythmgame:start", runId }), frameWindow, origin, runId)).toBe(true);
  });

  it("rejects a foreign origin even when source and run id match", () => {
    expect(isCurrentGameMessage(message(ready, { origin: "https://other.example" }), frameWindow, origin, runId)).toBe(false);
  });

  it("rejects a different source even when origin and run id match", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    try {
      expect(isCurrentGameMessage(message(ready, { source: iframe.contentWindow }), frameWindow, origin, runId)).toBe(false);
    } finally {
      iframe.remove();
    }
    expect(isCurrentGameMessage(message(ready, { source: null }), frameWindow, origin, runId)).toBe(false);
  });

  it("rejects messages before an iframe window exists", () => {
    expect(isCurrentGameMessage(message(ready, { source: null }), null, origin, runId)).toBe(false);
  });

  it("rejects old and future runs", () => {
    expect(isCurrentGameMessage(message({ runId: 6 }), frameWindow, origin, runId)).toBe(false);
    expect(isCurrentGameMessage(message({ runId: 8 }), frameWindow, origin, runId)).toBe(false);
  });

  it.each([null, undefined, false, 7, "7", [], [runId], {}, { type: "rhythmgame:ready" }])("rejects a missing object run id: %j", (data) => {
    expect(isCurrentGameMessage(message(data), frameWindow, origin, runId)).toBe(false);
  });

  it.each(["7", 7.5, NaN, Infinity])("rejects invalid message run ids: %j", (invalidRunId) => {
    expect(isCurrentGameMessage(message({ runId: invalidRunId }), frameWindow, origin, runId)).toBe(false);
  });

  it.each([7.5, NaN, Infinity])("rejects an invalid current run id even if it matches: %j", (invalidRunId) => {
    expect(isCurrentGameMessage(message({ runId: invalidRunId }), frameWindow, origin, invalidRunId)).toBe(false);
  });
});
