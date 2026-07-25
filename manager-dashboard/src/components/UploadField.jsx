import { useRef, useState } from 'react';
import { uploadMedia } from '../services/specialService.js';
import { apiErrorMessage } from '../services/api.js';

const ACCEPT = {
  image: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
  video: 'video/*',
};

/**
 * Uploads a single image/video for a special. `onProgress` covers the byte
 * transfer only — once it hits 100% the request is still pending on the
 * server (FFmpeg normalization for video), so we show "Processing" for that
 * gap instead of implying the upload is stuck.
 */
function UploadField({ mediaType, mediaUrl, onUploaded }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const inputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setProgress(0);
    setErrorMsg(null);

    try {
      const result = await uploadMedia(mediaType, file, (pct) => {
        setProgress(pct);
        if (pct >= 100) setStatus('processing');
      });
      setStatus('idle');
      onUploaded(result.mediaUrl, result.conversionStatus);
    } catch (err) {
      setStatus('error');
      setErrorMsg(apiErrorMessage(err, 'Upload failed'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="field">
      <label>{mediaType === 'video' ? 'Video file' : 'Image file'}</label>

      {mediaUrl && (
        <div className="media-preview">
          {mediaType === 'video' ? (
            <video src={mediaUrl} controls muted />
          ) : (
            <img src={mediaUrl} alt="Uploaded media preview" />
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[mediaType]}
        onChange={handleFileChange}
        disabled={status === 'uploading' || status === 'processing'}
      />

      {(status === 'uploading' || status === 'processing') && (
        <>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="status-text">
            {status === 'uploading'
              ? `Uploading… ${progress}%`
              : mediaType === 'video'
                ? 'Processing video (converting to MP4/H.264)…'
                : 'Processing…'}
          </div>
        </>
      )}

      {status === 'error' && <p className="error-text">{errorMsg}</p>}
      {!mediaUrl && status === 'idle' && (
        <div className="status-text">
          {mediaType === 'video'
            ? 'Any common video format is accepted — it will be normalized automatically.'
            : 'JPG, PNG, or WebP.'}
        </div>
      )}
    </div>
  );
}

export default UploadField;
