/** Laravel / axios error → user-visible message */
export function formatApiError(err, fallback = 'Request failed.') {
  const status = err?.response?.status;

  if (status === 429) {
    return 'Server busy hai (429). 1 minute wait karein, sirf ek tab rakhein, phir Dobara Try karein.';
  }
  if (status === 500) {
    return 'Server error (500). Backend logs check karein — aksar category DB migration ya file upload size ki wajah se hota hai.';
  }
  if (status === 403) return 'Admin access chahiye. Dobara login karein.';
  if (status === 401) return 'Session expire ho gaya. Dobara login karein.';
  if (status === 422) return 'Form data invalid hai. Required fields check karein.';

  const data = err?.response?.data;
  if (!data) return fallback;

  if (data.errors && typeof data.errors === 'object') {
    const lines = Object.values(data.errors).flat();
    if (lines.length) return lines.join(' ');
  }

  if (data.message) return data.message;

  return fallback;
}
