import { describe, it, expect } from 'vitest';
import { getNextItem } from './playlist.js';

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('getNextItem', () => {
  it('returns the item after the given id', () => {
    expect(getNextItem(items, 'a')).toEqual({ id: 'b' });
    expect(getNextItem(items, 'b')).toEqual({ id: 'c' });
  });

  it('wraps around to the first item after the last', () => {
    expect(getNextItem(items, 'c')).toEqual({ id: 'a' });
  });

  it('returns the first item when currentId is null/undefined', () => {
    expect(getNextItem(items, null)).toEqual({ id: 'a' });
    expect(getNextItem(items, undefined)).toEqual({ id: 'a' });
  });

  it('returns the first item when currentId no longer exists (deleted/reordered mid-loop)', () => {
    expect(getNextItem(items, 'does-not-exist')).toEqual({ id: 'a' });
  });

  it('returns null for an empty or missing playlist', () => {
    expect(getNextItem([], 'a')).toBeNull();
    expect(getNextItem(null, 'a')).toBeNull();
    expect(getNextItem(undefined, 'a')).toBeNull();
  });

  it('returns the same single item for a one-item playlist (self-loop)', () => {
    expect(getNextItem([{ id: 'solo' }], 'solo')).toEqual({ id: 'solo' });
  });
});
