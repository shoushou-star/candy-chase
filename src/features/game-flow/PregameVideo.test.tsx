import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PregameVideo } from './PregameVideo';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function visibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  fireEvent(document, new Event('visibilitychange'));
}

describe('PregameVideo', () => {
  it('keeps the ended frame while waiting and on removal without seeking back to the opening frame', async () => {
    const onFinished = vi.fn();
    const { unmount } = render(<PregameVideo onFinished={onFinished} />);
    const video = screen.getByLabelText('游戏开场视频') as HTMLVideoElement;
    video.currentTime = 12;
    fireEvent.click(video); fireEvent.keyDown(video, { key: 'Escape' });
    expect(onFinished).not.toHaveBeenCalled();
    fireEvent.ended(video); fireEvent.ended(video); fireEvent.error(video);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBe(12);
    expect(video.muted).toBe(false); expect(video.loop).toBe(false); expect(video.controls).toBe(false);
    await act(async () => {});
    unmount(); expect(video.currentTime).toBe(12);
  });

  it('requires a playback gesture after policy rejection and never treats it as completion', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
    const onFinished = vi.fn();
    render(<PregameVideo onFinished={onFinished} />);
    const button = await screen.findByRole('button', { name: '点击继续播放' });
    expect(onFinished).not.toHaveBeenCalled();
    fireEvent.click(button); await act(async () => {});
    expect(screen.queryByRole('button', { name: '点击继续播放' })).not.toBeInTheDocument();
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('pauses in background, resumes at the same position and exposes a gesture on resume rejection', async () => {
    const onFinished = vi.fn(); render(<PregameVideo onFinished={onFinished} />);
    await act(async () => {});
    const video = screen.getByLabelText('游戏开场视频') as HTMLVideoElement;
    video.currentTime = 5;
    visibility('hidden'); expect(video.pause).toHaveBeenCalled(); expect(video.currentTime).toBe(5);
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
    visibility('visible');
    await screen.findByRole('button', { name: '点击继续播放' });
    expect(video.currentTime).toBe(5); expect(onFinished).not.toHaveBeenCalled();
  });

  it('finishes on actual media failure but not on an interrupted playback request', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('interrupted', 'AbortError'));
    const onFinished = vi.fn(); render(<PregameVideo onFinished={onFinished} />);
    await act(async () => {}); expect(onFinished).not.toHaveBeenCalled();
    fireEvent.error(screen.getByLabelText('游戏开场视频'));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it.each(['resolve', 'reject'] as const)('ignores a late %s after unmount and leaves the detached media paused', async (outcome) => {
    let resolve!: () => void; let reject!: (error: Error) => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(() => new Promise<void>((yes, no) => { resolve = yes; reject = no; }));
    const onFinished = vi.fn(); const { unmount } = render(<PregameVideo onFinished={onFinished} />);
    const video = screen.getByLabelText('游戏开场视频') as HTMLVideoElement;
    video.currentTime = 4; unmount();
    const pauseCalls = vi.mocked(video.pause).mock.calls.length;
    await act(async () => { if (outcome === 'resolve') resolve(); else reject(new DOMException('decode', 'NotSupportedError')); });
    expect(onFinished).not.toHaveBeenCalled(); expect(video.currentTime).toBe(4);
    if (outcome === 'resolve') expect(vi.mocked(video.pause).mock.calls.length).toBeGreaterThan(pauseCalls);
  });

  it('does not let a pending play resolution restart media while hidden or after it ended', async () => {
    let resolve!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(() => new Promise<void>((yes) => { resolve = yes; }));
    const onFinished = vi.fn(); render(<PregameVideo onFinished={onFinished} />);
    const video = screen.getByLabelText('游戏开场视频') as HTMLVideoElement;
    visibility('hidden');
    vi.mocked(video.pause).mockClear();
    await act(async () => resolve()); expect(video.pause).toHaveBeenCalled();
    visibility('visible'); fireEvent.ended(video);
    vi.mocked(video.pause).mockClear();
    await act(async () => resolve()); expect(video.pause).toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('keeps the current playback alive when StrictMode resolves an earlier effect request', async () => {
    const resolves: (() => void)[] = [];
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(() => new Promise<void>((yes) => resolves.push(yes)));
    render(<StrictMode><PregameVideo onFinished={vi.fn()} /></StrictMode>);
    const video = screen.getByLabelText('游戏开场视频') as HTMLVideoElement;
    vi.mocked(video.pause).mockClear();
    await act(async () => resolves.forEach((resolve) => resolve()));
    expect(video.pause).not.toHaveBeenCalled();
  });
});
