import { useEffect, useRef } from 'react';
import Overlay from './Overlay.jsx';
import logger from '../services/logger.js';

const DEFAULT_IMAGE_DURATION_S = 10;
const STALL_TIMEOUT_MS = 8000;
// Absolute safety net in case a video's `ended` event never fires (codec
// quirk, hung decoder on TV hardware). The signage rule is "never freeze",
// so something must always eventually advance the playlist.
const HARD_CAP_MS = 5 * 60 * 1000;

const slideStyle = (isActive) => ({
  position: 'absolute',
  inset: 0,
  opacity: isActive ? 1 : 0,
  transition: 'opacity 400ms ease',
  pointerEvents: 'none',
});

const mediaStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

/**
 * Renders one playlist slot. Mounted for both the active item and the
 * next-up item simultaneously (see Player.jsx) so the browser fetches/
 * buffers the next item's media while the current one is still showing —
 * that's what makes the switch instant instead of a black-screen load.
 *
 * `item` can be null before the playlist has loaded; hooks stay
 * unconditional (guarded internally) since this same instance persists
 * across that null -> item transition.
 */
function MediaSlide({ item, isActive, onFinished }) {
  const videoRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const hasErroredRef = useRef(false);
  const imageTimerRef = useRef(null);
  const stallTimerRef = useRef(null);
  const hardCapTimerRef = useRef(null);

  const itemId = item?.id;
  const mediaType = item?.mediaType;

  const clearImageTimer = () => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  };

  const clearVideoTimers = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    if (hardCapTimerRef.current) {
      clearTimeout(hardCapTimerRef.current);
      hardCapTimerRef.current = null;
    }
  };

  // This component instance is reused across different items in the same
  // slot (that's what keeps the underlying <video>/<img> preloaded across
  // transitions) — so per-item flags must reset whenever the item changes.
  useEffect(() => {
    hasLoadedRef.current = false;
    hasErroredRef.current = false;
  }, [itemId]);

  // Image playback: display for the configured duration, then advance.
  useEffect(() => {
    if (!item || mediaType !== 'image' || !isActive) return undefined;

    if (hasErroredRef.current) {
      onFinished();
      return undefined;
    }

    const durationMs = (item.duration || DEFAULT_IMAGE_DURATION_S) * 1000;
    imageTimerRef.current = setTimeout(onFinished, durationMs);

    return clearImageTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, itemId, mediaType, item?.duration]);

  // Video playback: play when active, advance on `ended`, recover from
  // stalls/errors instead of freezing.
  useEffect(() => {
    const video = videoRef.current;
    if (!item || mediaType !== 'video' || !video) return undefined;

    if (!isActive) {
      video.pause();
      clearVideoTimers();
      return undefined;
    }

    if (hasErroredRef.current) {
      onFinished();
      return undefined;
    }

    video.currentTime = 0;
    video.play().catch((err) => {
      logger.error('Video Error', { id: itemId, reason: err.message });
      onFinished();
    });

    hardCapTimerRef.current = setTimeout(() => {
      logger.error('Video Error', { id: itemId, reason: 'hard-cap timeout, ended never fired' });
      onFinished();
    }, HARD_CAP_MS);

    return clearVideoTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, itemId, mediaType]);

  useEffect(() => clearImageTimer, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => clearVideoTimers, []);

  if (!item) return null;

  const armStallTimer = () => {
    if (stallTimerRef.current) return;
    stallTimerRef.current = setTimeout(() => {
      logger.error('Video Error', { id: item.id, reason: 'stalled' });
      onFinished();
    }, STALL_TIMEOUT_MS);
  };

  const disarmStallTimer = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  if (item.mediaType === 'video') {
    return (
      <div style={slideStyle(isActive)}>
        <video
          ref={videoRef}
          src={item.mediaUrl}
          style={mediaStyle}
          muted
          playsInline
          preload="auto"
          onLoadedData={() => {
            if (!hasLoadedRef.current) {
              hasLoadedRef.current = true;
              logger.info('Video Loaded', { id: item.id, mediaUrl: item.mediaUrl });
            }
          }}
          onPlaying={disarmStallTimer}
          onWaiting={armStallTimer}
          onStalled={armStallTimer}
          onEnded={() => {
            clearVideoTimers();
            onFinished();
          }}
          onError={() => {
            hasErroredRef.current = true;
            if (isActive) {
              logger.error('Video Error', { id: item.id, mediaUrl: item.mediaUrl });
              clearVideoTimers();
              onFinished();
            }
          }}
        />
        {isActive && <Overlay item={item} />}
      </div>
    );
  }

  return (
    <div style={slideStyle(isActive)}>
      <img
        src={item.mediaUrl}
        alt={item.dishName}
        style={mediaStyle}
        onLoad={() => {
          if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            logger.info('Image Loaded', { id: item.id, mediaUrl: item.mediaUrl });
          }
        }}
        onError={() => {
          hasErroredRef.current = true;
          if (isActive) {
            logger.error('Image Error', { id: item.id, mediaUrl: item.mediaUrl });
            clearImageTimer();
            onFinished();
          }
        }}
      />
      {isActive && <Overlay item={item} />}
    </div>
  );
}

export default MediaSlide;
