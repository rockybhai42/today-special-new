import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listSpecials,
  deleteSpecial,
  toggleSpecial,
  reorderSpecials,
} from '../services/specialService.js';
import { apiErrorMessage } from '../services/api.js';

function DashboardPage() {
  const [specials, setSpecials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listSpecials();
      setSpecials(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to load specials'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(id) {
    setBusyId(id);
    try {
      const updated = await toggleSpecial(id);
      setSpecials((prev) => prev.map((s) => (s._id === id ? updated : s)));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update special'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This also removes its uploaded media.`)) return;
    setBusyId(id);
    try {
      await deleteSpecial(id);
      setSpecials((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete special'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= specials.length) return;

    const reordered = [...specials];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    const order = reordered.map((special, i) => ({ id: special._id, displayOrder: i + 1 }));

    // Reflect the new order immediately; reconcile with the server's
    // response (source of truth for the persisted displayOrder values).
    setSpecials(reordered.map((special, i) => ({ ...special, displayOrder: i + 1 })));

    try {
      const updated = await reorderSpecials(order);
      setSpecials(updated);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to reorder playlist'));
      load();
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Today's Specials</h1>
        <Link to="/specials/new" className="btn">
          + Add Special
        </Link>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="empty-state">Loading…</div>
        ) : specials.length === 0 ? (
          <div className="empty-state">
            No specials yet. Click "Add Special" to create your first playlist item.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Dish</th>
                <th>Price</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Order</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {specials.map((special, index) => (
                <tr key={special._id}>
                  <td>
                    {special.mediaType === 'video' ? (
                      <video className="thumb" src={special.mediaUrl} muted />
                    ) : (
                      <img className="thumb" src={special.mediaUrl} alt={special.dishName} />
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{special.dishName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{special.title}</div>
                  </td>
                  <td>${Number(special.price).toFixed(2)}</td>
                  <td>{special.mediaType}</td>
                  <td>{special.mediaType === 'image' ? `${special.duration}s` : '—'}</td>
                  <td>
                    <span className={`badge ${special.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {special.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        disabled={index === 0 || busyId === special._id}
                        onClick={() => handleMove(index, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        disabled={index === specials.length - 1 || busyId === special._id}
                        onClick={() => handleMove(index, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        disabled={busyId === special._id}
                        onClick={() => handleToggle(special._id)}
                      >
                        {special.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <Link to={`/specials/${special._id}/edit`} className="btn btn-secondary btn-icon">
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger btn-icon"
                        disabled={busyId === special._id}
                        onClick={() => handleDelete(special._id, special.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
