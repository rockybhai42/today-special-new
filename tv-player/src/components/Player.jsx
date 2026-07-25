import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlaylist } from '../hooks/usePlaylist.js';
import { getNextItem } from '../utils/playlist.js';
import MediaSlide from './MediaSlide.jsx';
import IdleScreen from './IdleScreen.jsx';
import logger from '../services/logger.js';

const containerStyle = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  background: '#000',
  overflow: 'hidden',
};

/**
 * Orchestrates the endless playlist loop using a 2-slot lookahead buffer:
 * one slot is active (playing/showing), the other always holds the
 * pre-buffered next item. On advance the slots swap roles instantly (no
 * black screen, no reload) and the newly-inactive slot is loaded with the
 * item after that, keeping the buffer one step ahead forever.
 */
function Player() {
  const { items, isOnline } = usePlaylist();
  const itemsRef = useRef(items);
  const [slotItems, setSlotItems] = useState([null, null]);
  const [activeSlot, setActiveSlot] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      initializedRef.current = false;
      setSlotItems([null, null]);
      return;
    }
    if (!initializedRef.current) {
      const first = items[0];
      const second = getNextItem(items, first.id);
      setSlotItems([first, second]);
      setActiveSlot(0);
      initializedRef.current = true;
      logger.info('Playback Started', { itemCount: items.length });
    }
  }, [items]);

  const handleFinished = useCallback(() => {
    logger.info('Playback Finished');

    if (itemsRef.current.length === 0) {
      initializedRef.current = false;
      setSlotItems([null, null]);
      return;
    }

    setSlotItems((prev) => {
      const otherSlot = activeSlot === 0 ? 1 : 0;
      const upcoming = prev[otherSlot] ?? itemsRef.current[0];
      const followUp = getNextItem(itemsRef.current, upcoming.id);
      const next = [...prev];
      next[activeSlot] = followUp;
      return next;
    });
    setActiveSlot((slot) => (slot === 0 ? 1 : 0));
  }, [activeSlot]);

  useEffect(() => {
    if (!isOnline) {
      logger.warn('Playback continuing offline on cached playlist');
    }
  }, [isOnline]);

  const hasContent = slotItems[0] || slotItems[1];

  return (
    <div style={containerStyle}>
      {!hasContent && <IdleScreen />}
      <MediaSlide item={slotItems[0]} isActive={activeSlot === 0} onFinished={handleFinished} />
      <MediaSlide item={slotItems[1]} isActive={activeSlot === 1} onFinished={handleFinished} />
    </div>
  );
}

export default Player;
