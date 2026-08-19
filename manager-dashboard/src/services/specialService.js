import api from './api.js';

export async function listSpecials() {
  const { data } = await api.get('/api/specials');
  return data.data;
}

export async function getSpecial(id) {
  const { data } = await api.get(`/api/specials/${id}`);
  return data.data;
}

export async function createSpecial(payload) {
  const { data } = await api.post('/api/specials', payload);
  return data.data;
}

export async function updateSpecial(id, payload) {
  const { data } = await api.put(`/api/specials/${id}`, payload);
  return data.data;
}

export async function deleteSpecial(id) {
  await api.delete(`/api/specials/${id}`);
}

export async function toggleSpecial(id) {
  const { data } = await api.patch(`/api/specials/${id}/toggle`);
  return data.data;
}

export async function reorderSpecials(order) {
  const { data } = await api.patch('/api/specials/reorder', { order });
  return data.data;
}

/**
 * Uploads a media file for a special. `onProgress` receives a 0-100 integer
 * covering the upload phase only — the response doesn't resolve until the
 * server finishes (for video: FFmpeg normalization), so callers should show
 * an indeterminate "processing" state once progress hits 100.
 */
export async function uploadMedia(mediaType, file, onProgress) {
  const field = mediaType === 'video' ? 'video' : 'image';
  const endpoint = mediaType === 'video' ? '/api/specials/upload/video' : '/api/specials/upload/image';

  const formData = new FormData();
  formData.append(field, file);

  const { data } = await api.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Overrides the client's 15s default — video upload waits through
    // server-side FFmpeg normalization (plus a possible free-tier host
    // cold-start) before responding, which routinely exceeds 15s.
    timeout: mediaType === 'video' ? 180000 : 30000,
    onUploadProgress: (evt) => {
      if (!onProgress || !evt.total) return;
      onProgress(Math.round((evt.loaded / evt.total) * 100));
    },
  });

  return data.data; // { mediaType, mediaUrl, conversionStatus }
}
