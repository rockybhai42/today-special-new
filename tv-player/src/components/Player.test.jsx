import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Player from './Player.jsx';
import { usePlaylist } from '../hooks/usePlaylist.js';

vi.mock('../hooks/usePlaylist.js', () => ({ usePlaylist: vi.fn() }));
vi.mock('../services/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Replaces the real image/video element with a controllable stub so these
// tests exercise Player's slot-swapping/lookahead logic in isolation, not
// jsdom's (nonexistent) media playback.
vi.mock('./MediaSlide.jsx', () => ({
  default: ({ item, isActive, onFinished }) => (
    <div data-slide data-active={isActive ? 'true' : 'false'}>
      <span>{item ? item.id : 'empty'}</span>
      <button onClick={onFinished}>finish {item ? item.id : ''}</button>
    </div>
  ),
}));

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function activeSlideId(container) {
  const active = container.querySelector('[data-slide][data-active="true"]');
  return active.querySelector('span').textContent;
}

function inactiveSlideId(container) {
  const inactive = container.querySelector('[data-slide][data-active="false"]');
  return inactive.querySelector('span').textContent;
}

function clickActiveFinish(container) {
  const active = container.querySelector('[data-slide][data-active="true"]');
  fireEvent.click(active.querySelector('button'));
}

beforeEach(() => {
  usePlaylist.mockReturnValue({ items, isOnline: true });
});

describe('Player — two-slot lookahead buffer', () => {
  it('starts on the first item with the second item preloaded in the other slot', () => {
    const { container } = render(<Player />);
    expect(activeSlideId(container)).toBe('a');
    expect(inactiveSlideId(container)).toBe('b');
  });

  it('advances to the preloaded item and preloads the one after it', () => {
    const { container } = render(<Player />);

    clickActiveFinish(container);

    expect(activeSlideId(container)).toBe('b');
    expect(inactiveSlideId(container)).toBe('c');
  });

  it('wraps around to the start of the playlist', () => {
    const { container } = render(<Player />);

    clickActiveFinish(container); // a -> b (preload c)
    clickActiveFinish(container); // b -> c (preload a)

    expect(activeSlideId(container)).toBe('c');
    expect(inactiveSlideId(container)).toBe('a');

    clickActiveFinish(container); // c -> a (preload b)
    expect(activeSlideId(container)).toBe('a');
    expect(inactiveSlideId(container)).toBe('b');
  });

  it('self-loops a single-item playlist without crashing', () => {
    usePlaylist.mockReturnValue({ items: [{ id: 'solo' }], isOnline: true });
    const { container } = render(<Player />);

    expect(activeSlideId(container)).toBe('solo');

    clickActiveFinish(container);
    expect(activeSlideId(container)).toBe('solo');
  });

  it('shows the idle screen with an empty playlist', () => {
    usePlaylist.mockReturnValue({ items: [], isOnline: true });
    render(<Player />);

    expect(screen.getByText(/no specials are currently active/i)).toBeInTheDocument();
  });
});
