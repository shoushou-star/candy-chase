import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameplayFrame } from './GameplayFrame';

const result = { finalScore: 150, maxCombo: 2, perfect: 1, good: 1, miss: 0,
  accuracy: 75, repairPercent: 50, starRating: 2, totalNotes: 2, judgedNotes: 2 };
function message(frame: HTMLIFrameElement, data: object, source = frame.contentWindow, origin = location.origin) {
  fireEvent(window, new MessageEvent('message', { data, source, origin }));
}
afterEach(() => vi.restoreAllMocks());

describe('GameplayFrame', () => {
  it('reports a native iframe load error once and removes its listener on unmount', () => {
    const onError = vi.fn(); const onReady = vi.fn();
    const { unmount } = render(<GameplayFrame runId={1} active={false} onReady={onReady}
      onComplete={vi.fn()} onError={onError} />);
    const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement;
    fireEvent.error(frame); fireEvent.error(frame);
    message(frame, { type: 'rhythmgame:ready', runId: 1 });
    expect(onError).toHaveBeenCalledTimes(1); expect(onReady).not.toHaveBeenCalled();
    unmount(); fireEvent.error(frame);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('preloads inertly, ignores load, validates ready and starts once after activation', () => {
    const onReady = vi.fn();
    const props = { runId: 4, active: false, onReady, onComplete: vi.fn(), onError: vi.fn() };
    const { rerender } = render(<GameplayFrame {...props} />);
    const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement;
    const send = vi.spyOn(frame.contentWindow!, 'postMessage');
    expect(frame).toHaveAttribute('inert');
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    expect(frame).toHaveAttribute('allow', 'autoplay');
    fireEvent.load(frame);
    message(frame, { type: 'rhythmgame:ready', runId: 4 }, window);
    message(frame, { type: 'rhythmgame:ready', runId: 4 }, frame.contentWindow, 'https://wrong.example');
    message(frame, { type: 'rhythmgame:ready', runId: 3 });
    expect(onReady).not.toHaveBeenCalled();
    message(frame, { type: 'rhythmgame:ready', runId: 4 });
    message(frame, { type: 'rhythmgame:ready', runId: 4 });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    rerender(<GameplayFrame {...props} active />);
    expect(screen.getByTitle('节奏游戏')).toBe(frame);
    expect(frame).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(frame);
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'rhythmgame:start', runId: 4 }, location.origin);
    rerender(<GameplayFrame {...props} active onReady={vi.fn()} />);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('accepts one valid complete only in the started phase and preserves all ten fields', () => {
    const onComplete = vi.fn(); const onError = vi.fn();
    const props = { runId: 4, onReady: vi.fn(), onComplete, onError };
    const { rerender, unmount } = render(<GameplayFrame {...props} active={false} />);
    const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement;
    message(frame, { type: 'rhythmgame:complete', runId: 4, result: {} });
    message(frame, { type: 'rhythmgame:ready', runId: 4 });
    rerender(<GameplayFrame {...props} active />);
    message(frame, { type: 'unrelated', runId: 4, result: {} });
    message(frame, { type: 'rhythmgame:complete', runId: 3, result });
    message(frame, { type: 'rhythmgame:complete', runId: 4, result }, window);
    expect(onComplete).not.toHaveBeenCalled(); expect(onError).not.toHaveBeenCalled();
    message(frame, { type: 'rhythmgame:complete', runId: 4, result });
    message(frame, { type: 'rhythmgame:complete', runId: 4, result: {} });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(result);
    expect(onError).not.toHaveBeenCalled();
    const source = frame.contentWindow;
    unmount();
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source,
      data: { type: 'rhythmgame:complete', runId: 4, result } })));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reports malformed current results once without accepting a later replacement', () => {
    const onComplete = vi.fn(); const onError = vi.fn();
    render(<GameplayFrame runId={1} active onReady={vi.fn()} onComplete={onComplete} onError={onError} />);
    const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement;
    message(frame, { type: 'rhythmgame:ready', runId: 1 });
    message(frame, { type: 'rhythmgame:complete', runId: 1, result: { ...result, judgedNotes: 1 } });
    message(frame, { type: 'rhythmgame:complete', runId: 1, result });
    expect(onError).toHaveBeenCalledTimes(1); expect(onComplete).not.toHaveBeenCalled();
  });
});
