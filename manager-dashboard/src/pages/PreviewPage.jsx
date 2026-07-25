import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSpecials } from '../services/specialService.js';
import { apiErrorMessage } from '../services/api.js';

const DEFAULT_DURATION_S = 10;

/**
 * A simplified simulation of what the TV player shows: cycles through the
 * active playlist in order. Unlike the real player it remounts the media
 * element on every transition (a brief reload is an acceptable trade-off
 * here — this is a staff preview tool, not the production signage device).
 */
function PreviewPage() {
  const [specials, setSpecials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    listSpecials()
      .then(setSpecials)
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load playlist')))
      .finally(() => setIsLoading(false));
  }, []);

  const items = useMemo(
    () => specials.filter((s) => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [specials]
  );

  const current = items.length > 0 ? items[index % items.length] : null;

  useEffect(() => {
    if (!current || current.mediaType !== 'image') return undefined;
    const durationMs = (current.duration || DEFAULT_DURATION_S) * 1000;
    const timer = setTimeout(() => setIndex((i) => i + 1), durationMs);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <div>
      <div className="page-header">
        <h1>Playlist Preview</h1>
        <Link to="/" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {!isLoading && items.length === 0 && !error && (
        <div className="banner banner-info">No active specials — the TV player would show a blank idle screen.</div>
      )}

      <div className="preview-tv">
        {current &&
          (current.mediaType === 'video' ? (
            <video
              key={current._id}
              src={current.mediaUrl}
              autoPlay
              muted
              playsInline
              onEnded={() => setIndex((i) => i + 1)}
              onError={() => setIndex((i) => i + 1)}
            />
          ) : (
            <img key={current._id} src={current.mediaUrl} alt={current.dishName} />
          ))}
        {current && (
          <div className="preview-overlay">
            <div className="dish">{current.dishName}</div>
            {current.description && <div className="desc">{current.description}</div>}
            <div className="price">${Number(current.price).toFixed(2)}</div>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <p className="status-text" style={{ marginTop: 12 }}>
          Showing {(index % items.length) + 1} of {items.length} active specials, in playlist order.
        </p>
      )}
    </div>
  );
}

export default PreviewPage;
