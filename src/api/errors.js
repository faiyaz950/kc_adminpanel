/** Laravel / axios error → user-visible message */
export function formatApiError(err, fallback = 'Request failed.') {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;

  if (data.errors && typeof data.errors === 'object') {
    const lines = Object.values(data.errors).flat();
    if (lines.length) return lines.join(' ');
  }

  const msg = data.message;
  if (msg && msg !== 'Server Error') return msg;

  const status = err?.response?.status;
  if (status === 500) {
    return 'Server error (500). Backend logs check karein — aksar category DB migration ya file upload size ki wajah se hota hai.';
  }
  if (status === 403) return 'Admin access chahiye. Dobara login karein.';
  if (status === 401) return 'Session expire ho gaya. Dobara login karein.';
  if (status === 422) return 'Form data invalid hai. Required fields check karein.';

  return msg || fallback;
}
