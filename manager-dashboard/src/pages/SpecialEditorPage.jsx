import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import UploadField from '../components/UploadField.jsx';
import { getSpecial, createSpecial, updateSpecial } from '../services/specialService.js';
import { apiErrorMessage } from '../services/api.js';

const emptyForm = {
  title: '',
  dishName: '',
  description: '',
  price: '',
  mediaType: 'image',
  mediaUrl: '',
  duration: 10,
  isActive: true,
};

function SpecialEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEditing) return;
    getSpecial(id)
      .then((special) =>
        setForm({
          title: special.title,
          dishName: special.dishName,
          description: special.description || '',
          price: special.price,
          mediaType: special.mediaType,
          mediaUrl: special.mediaUrl,
          duration: special.duration,
          isActive: special.isActive,
        })
      )
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load special')))
      .finally(() => setIsLoading(false));
  }, [id, isEditing]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleMediaTypeChange(mediaType) {
    // Switching type invalidates whatever was already uploaded for the old type.
    setForm((prev) => ({ ...prev, mediaType, mediaUrl: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.mediaUrl) {
      setError('Upload media before saving.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      dishName: form.dishName.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      mediaType: form.mediaType,
      mediaUrl: form.mediaUrl,
      duration: form.mediaType === 'image' ? Number(form.duration) || 10 : form.duration || 10,
      isActive: form.isActive,
    };

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateSpecial(id, payload);
      } else {
        await createSpecial(payload);
      }
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save special'));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="empty-state">Loading…</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEditing ? 'Edit Special' : 'New Special'}</h1>
        <Link to="/" className="btn btn-secondary">
          Cancel
        </Link>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="mediaType">Media type</label>
          <select
            id="mediaType"
            value={form.mediaType}
            onChange={(e) => handleMediaTypeChange(e.target.value)}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>

        <UploadField
          mediaType={form.mediaType}
          mediaUrl={form.mediaUrl}
          onUploaded={(mediaUrl) => update('mediaUrl', mediaUrl)}
        />

        <div className="field-row">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="field">
            <label htmlFor="dishName">Dish name</label>
            <input
              id="dishName"
              type="text"
              value={form.dishName}
              onChange={(e) => update('dishName', e.target.value)}
              required
              maxLength={120}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="price">Price ($)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              required
            />
          </div>
          {form.mediaType === 'image' && (
            <div className="field">
              <label htmlFor="duration">Display duration (seconds)</label>
              <input
                id="duration"
                type="number"
                min="1"
                value={form.duration}
                onChange={(e) => update('duration', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update('isActive', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Active (visible on TV player)
          </label>
        </div>

        <button type="submit" className="btn" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Special'}
        </button>
      </form>
    </div>
  );
}

export default SpecialEditorPage;
