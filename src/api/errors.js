/** Laravel / axios error → user-visible message */
export function formatApiError(err, fallback = 'Request failed.') {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
    const url = err?.config?.url || '';
    if (/notification/i.test(url)) {
      return 'Notification bhejne mein timeout ho gaya. Bahut zyada users hain — thodi der baad dubara try karein.';
    }
    return 'Upload timeout ho gaya. Badi audio file hai — 2-3 minute wait karein, phir dubara try karein.';
  }
  if (!err?.response) {
    return 'Server se connection toot gaya. Upload server par save ho chuka ho sakta hai — neeche list check karein ya page refresh karein.';
  }

  if (data?.errors && typeof data.errors === 'object') {
    const lines = Object.values(data.errors).flat();
    if (lines.length) return lines.join(' ');
  }
  if (data?.message) return data.message;
  if (data?.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);

  if (status === 413) {
    return 'File bahut bari hai. Audio ~100MB se chhoti rakhein ya compress karein.';
  }
  if (status === 429) {
    return 'Server busy hai (429). 1 minute wait karein, sirf ek tab rakhein, phir Dobara Try karein.';
  }
  if (status === 504) {
    return 'Server upload timeout (504). Audio save ho chuka ho sakta hai — neeche list check karein.';
  }
  if (status === 500) {
    return 'Server error (500). Backend logs check karein — aksar file upload size ya DB migration ki wajah se hota hai.';
  }
  if (status === 403) return 'Admin access chahiye. Dobara login karein.';
  if (status === 401) return 'Session expire ho gaya. Dobara login karein.';
  if (status === 422) return 'Form data invalid hai. Required fields check karein.';

  return fallback;
}
