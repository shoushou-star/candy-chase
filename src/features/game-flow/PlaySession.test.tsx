import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaySession } from './PlaySession';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const props = () => ({ runId: 1, playIntro: true, onComplete: vi.fn(), onRetryLoad: vi.fn(),
  onReturnToLobby: vi.fn(), onGameplayStarted: vi.fn() });
function ready(frame: HTMLIFrameElement, runId = 1) {
  fireEvent(window, new MessageEvent('message', { origin: location.origin, source: frame.contentWindow,
    data: { type: 'rhythmgame:ready', runId } }));
}

describe('PlaySession', () => {
  it.each(['video-first', 'ready-first'])('starts once with both conditions in %s order without rebuilding iframe', async (order) => {
    const callbacks = props(); const { rerender } = render(<PlaySession {...callbacks} />);
    const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement;
    const send = vi.spyOn(frame.contentWindow!, 'postMessage');
    const video = screen.getByLabelText('游戏开场视频') as HTMLVideoElement; video.currentTime = 12;
    if (order === 'video-first') {
      fireEvent.ended(video); expect(screen.getByText('LOADING...')).toBeInTheDocument();
      expect(video.currentTime).toBe(12); expect(send).not.toHaveBeenCalled(); ready(frame);
    } else {
      ready(frame); expect(send).not.toHaveBeenCalled(); expect(frame).toHaveAttribute('inert'); fireEvent.ended(video);
    }
    await act(async () => {});
    ready(frame); rerender(<PlaySession {...callbacks} onGameplayStarted={vi.fn()} />);
    expect(screen.getByTitle('节奏游戏')).toBe(frame);
    expect(screen.queryByLabelText('游戏开场视频')).not.toBeInTheDocument();
    expect(frame).not.toHaveAttribute('aria-hidden', 'true');
    expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'rhythmgame:start', runId: 1 }, location.origin);
    expect(callbacks.onGameplayStarted).toHaveBeenCalledTimes(1);
  });

  it('starts the ten-second timeout only after video completion and offers recovery', async () => {
    const callbacks = props(); render(<PlaySession {...callbacks} />);
    act(() => vi.advanceTimersByTime(20000)); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.ended(screen.getByLabelText('游戏开场视频'));
    act(() => vi.advanceTimersByTime(9999)); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1)); expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '重新加载' }));
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }));
    expect(callbacks.onRetryLoad).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '返回大厅' }));
    expect(callbacks.onReturnToLobby).toHaveBeenCalledTimes(1);
    await act(async () => {});
  });

  it('reloads with a new runId and playIntro=false, ignores the old frame and skips the completed video', async () => {
    const callbacks = props(); const { rerender } = render(<PlaySession {...callbacks} />);
    const oldFrame = screen.getByTitle('节奏游戏') as HTMLIFrameElement; const oldWindow = oldFrame.contentWindow;
    fireEvent.ended(screen.getByLabelText('游戏开场视频'));
    act(() => vi.advanceTimersByTime(10000));
    rerender(<PlaySession {...callbacks} runId={2} playIntro={false} />);
    const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement;
    expect(frame).not.toBe(oldFrame); expect(screen.queryByLabelText('游戏开场视频')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent(window, new MessageEvent('message', { origin: location.origin, source: oldWindow,
      data: { type: 'rhythmgame:ready', runId: 1 } }));
    expect(frame).toHaveAttribute('inert'); ready(frame, 2);
    expect(frame).not.toHaveAttribute('inert'); expect(callbacks.onGameplayStarted).toHaveBeenCalledTimes(1);
    await act(async () => {});
  });

  it('removes the game and reports invalid completion instead of emitting a fake result', async () => {
    const callbacks = props(); render(<PlaySession {...callbacks} playIntro={false} />);
    const frame = screen.getByTitle('节奏游戏') as HTMLIFrameElement; ready(frame);
    fireEvent(window, new MessageEvent('message', { origin: location.origin, source: frame.contentWindow,
      data: { type: 'rhythmgame:complete', runId: 1, result: {} } }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTitle('节奏游戏')).not.toBeInTheDocument();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    await act(async () => {});
  });

  it('does not let an iframe preload error skip the unfinished intro', async () => {
    render(<PlaySession {...props()} />);
    const video = screen.getByLabelText('游戏开场视频');
    fireEvent.error(screen.getByTitle('节奏游戏'));
    expect(screen.getByLabelText('游戏开场视频')).toBe(video);
    expect(screen.queryByRole('button', { name: '重新加载' })).not.toBeInTheDocument();
    fireEvent.ended(video);
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();
    await act(async () => {});
  });
});
