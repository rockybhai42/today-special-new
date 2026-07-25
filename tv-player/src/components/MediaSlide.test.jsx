import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import MediaSlide from './MediaSlide.jsx';

vi.mock('../services/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const imageItem = { id: 'img-1', mediaType: 'image', mediaUrl: 'a.jpg', dishName: 'Dish', duration: 8 };
const videoItem = { id: 'vid-1', mediaType: 'video', mediaUrl: 'a.mp4', dishName: 'Dish' };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MediaSlide — image playback', () => {
  it('advances after the configured duration when active', () => {
    const onFinished = vi.fn();
    render(<MediaSlide item={imageItem} isActive onFinished={onFinished} />);

    vi.advanceTimersByTime(7999);
    expect(onFinished).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('does not advance while inactive (preloading slot)', () => {
    const onFinished = vi.fn();
    render(<MediaSlide item={imageItem} isActive={false} onFinished={onFinished} />);

    vi.advanceTimersByTime(60_000);
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('skips immediately on image load error when active', () => {
    const onFinished = vi.fn();
    const { container } = render(<MediaSlide item={imageItem} isActive onFinished={onFinished} />);

    fireEvent.error(container.querySelector('img'));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('falls back to a default duration when none is configured', () => {
    const onFinished = vi.fn();
    render(<MediaSlide item={{ ...imageItem, duration: undefined }} isActive onFinished={onFinished} />);

    vi.advanceTimersByTime(10_000);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});

describe('MediaSlide — video playback', () => {
  it('advances on the ended event', () => {
    const onFinished = vi.fn();
    const { container } = render(<MediaSlide item={videoItem} isActive onFinished={onFinished} />);

    fireEvent.ended(container.querySelector('video'));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('skips after a stall that never recovers', () => {
    const onFinished = vi.fn();
    const { container } = render(<MediaSlide item={videoItem} isActive onFinished={onFinished} />);

    fireEvent.stalled(container.querySelector('video'));
    vi.advanceTimersByTime(7999);
    expect(onFinished).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('does not skip if playback resumes before the stall timeout', () => {
    const onFinished = vi.fn();
    const { container } = render(<MediaSlide item={videoItem} isActive onFinished={onFinished} />);
    const video = container.querySelector('video');

    fireEvent.stalled(video);
    vi.advanceTimersByTime(5000);
    fireEvent.playing(video);
    vi.advanceTimersByTime(10_000);

    expect(onFinished).not.toHaveBeenCalled();
  });

  it('skips immediately on a video error when active', () => {
    const onFinished = vi.fn();
    const { container } = render(<MediaSlide item={videoItem} isActive onFinished={onFinished} />);

    fireEvent.error(container.querySelector('video'));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('force-advances via the hard-cap watchdog if ended never fires', () => {
    const onFinished = vi.fn();
    render(<MediaSlide item={videoItem} isActive onFinished={onFinished} />);

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(onFinished).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});

describe('MediaSlide — slot reuse across items', () => {
  it('does not carry an error flag over to a different item placed in the same slot', () => {
    const onFinished = vi.fn();
    const { container, rerender } = render(<MediaSlide item={imageItem} isActive onFinished={onFinished} />);

    // Error the first item while active — this is the buggy scenario:
    // hasErroredRef must be scoped to imageItem, not to the component instance.
    fireEvent.error(container.querySelector('img'));
    expect(onFinished).toHaveBeenCalledTimes(1);
    onFinished.mockClear();

    // Same slot, a different item now assigned to it (as Player.jsx does on advance).
    const nextItem = { id: 'img-2', mediaType: 'image', mediaUrl: 'b.jpg', dishName: 'Dish 2', duration: 8 };
    rerender(<MediaSlide item={nextItem} isActive onFinished={onFinished} />);

    // Should NOT skip immediately just because the previous occupant errored.
    vi.advanceTimersByTime(100);
    expect(onFinished).not.toHaveBeenCalled();

    vi.advanceTimersByTime(8000);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});

describe('MediaSlide — no item', () => {
  it('renders nothing without crashing', () => {
    const { container } = render(<MediaSlide item={null} isActive={false} onFinished={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
