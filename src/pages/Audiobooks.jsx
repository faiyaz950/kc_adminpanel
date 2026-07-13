import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import AudioProcessor from '../components/AudioProcessor';
import ErrorBanner from '../components/ErrorBanner';

const formatDur = (secs) => {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const emptyBookForm = {
  title: '', author: '', description: '', sort_order: '0', is_published: true,
};

const emptyChapterForm = {
  title: '', chapter_number: '', sort_order: '0', is_introduction: false, is_published: true,
};

export default function Audiobooks() {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [error, setError] = useState('');

  const [showBookForm, setShowBookForm] = useState(false);
  const [bookEditId, setBookEditId] = useState(null);
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [bookSaving, setBookSaving] = useState(false);
  const [bookSaveError, setBookSaveError] = useState('');
  const [deleteBookId, setDeleteBookId] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [existingCover, setExistingCover] = useState(null);

  const [showChapterForm, setShowChapterForm] = useState(false);
  const [chapterEditId, setChapterEditId] = useState(null);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterSaveError, setChapterSaveError] = useState('');
  const [deleteChapterId, setDeleteChapterId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [finalAudio, setFinalAudio] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState(null);

  const coverRef = useRef();
  const audioRef = useRef();
  const bookFormRef = useRef();
  const chapterFormRef = useRef();

  useEffect(() => { fetchBooks(); }, []);

  useEffect(() => () => {
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
  }, [coverPreview, audioPreviewUrl]);

  async function fetchBooks() {
    setLoading(true); setError('');
    try {
      const res = await client.get('/audiobooks');
      setBooks(Array.isArray(res.data) ? res.data : []);
    } catch (e) { setError(formatApiError(e)); }
    finally { setLoading(false); }
  }

  async function loadChapters(book) {
    setSelectedBook(book);
    setChaptersLoading(true);
    try {
      const res = await client.get(`/audiobooks/${book.id}`);
      setChapters(Array.isArray(res.data?.chapters) ? res.data.chapters : []);
    } catch (e) {
      setChapters([]);
      alert(formatApiError(e));
    } finally { setChaptersLoading(false); }
  }

  function resetBookForm() {
    setBookForm(emptyBookForm);
    setCoverFile(null);
    setExistingCover(null);
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setBookSaveError('');
    setBookEditId(null);
  }

  function openAddBook() {
    resetBookForm();
    setShowBookForm(true);
    setTimeout(() => bookFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  function openEditBook(b) {
    resetBookForm();
    setBookEditId(b.id);
    setBookForm({
      title: b.title || '',
      author: b.author || '',
      description: b.description || '',
      sort_order: String(b.sort_order ?? 0),
      is_published: b.is_published !== false,
    });
    setExistingCover(b.cover_image_url || null);
    setShowBookForm(true);
    setTimeout(() => bookFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  async function handleSaveBook(e) {
    e.preventDefault(); setBookSaveError('');
    if (!bookForm.title.trim()) { setBookSaveError('Title is required'); return; }

    setBookSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', bookForm.title.trim());
      if (bookForm.author.trim()) fd.append('author', bookForm.author.trim());
      if (bookForm.description.trim()) fd.append('description', bookForm.description.trim());
      fd.append('sort_order', bookForm.sort_order || '0');
      fd.append('is_published', bookForm.is_published ? '1' : '0');
      if (coverFile) fd.append('cover', coverFile);

      if (bookEditId) {
        await client.post(`/audiobooks/${bookEditId}`, fd);
      } else {
        await client.post('/audiobooks', fd);
      }
      await fetchBooks();
      resetBookForm();
      setShowBookForm(false);
    } catch (e) { setBookSaveError(formatApiError(e)); }
    finally { setBookSaving(false); }
  }

  async function handleDeleteBook(id) {
    try {
      await client.delete(`/audiobooks/${id}`);
      setBooks(b => b.filter(x => x.id !== id));
      if (selectedBook?.id === id) {
        setSelectedBook(null);
        setChapters([]);
      }
    } catch (e) { alert(formatApiError(e)); }
    finally { setDeleteBookId(null); }
  }

  function resetChapterForm() {
    setChapterForm(emptyChapterForm);
    setAudioFile(null);
    setFinalAudio(null);
    setExistingAudioUrl(null);
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setChapterSaveError('');
    setChapterEditId(null);
  }

  function openAddChapter() {
    if (!selectedBook) return;
    resetChapterForm();
    setShowChapterForm(true);
    setTimeout(() => chapterFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  function openEditChapter(c) {
    resetChapterForm();
    setChapterEditId(c.id);
    setChapterForm({
      title: c.title || '',
      chapter_number: c.chapter_number != null ? String(c.chapter_number) : '',
      sort_order: String(c.sort_order ?? 0),
      is_introduction: !!c.is_introduction,
      is_published: c.is_published !== false,
    });
    setExistingAudioUrl(c.audio_url || null);
    setShowChapterForm(true);
    setTimeout(() => chapterFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  function handleAudioPick(e) {
    const f = e.target.files[0]; if (!f) return;
    setAudioFile(f); setFinalAudio(f); setChapterSaveError('');
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(f));
  }

  function handleProcessed(file, url) {
    setFinalAudio(file);
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(url);
  }

  function handleCoverPick(e) {
    const f = e.target.files[0]; if (!f) return;
    setCoverFile(f);
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function handleSaveChapter(e) {
    e.preventDefault(); setChapterSaveError('');
    if (!selectedBook) return;
    if (!chapterForm.title.trim()) { setChapterSaveError('Title is required'); return; }
    if (!chapterEditId && !finalAudio) { setChapterSaveError('Audio file is required'); return; }

    setChapterSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', chapterForm.title.trim());
      if (chapterForm.chapter_number) fd.append('chapter_number', chapterForm.chapter_number);
      fd.append('sort_order', chapterForm.sort_order || '0');
      fd.append('is_introduction', chapterForm.is_introduction ? '1' : '0');
      fd.append('is_published', chapterForm.is_published ? '1' : '0');
      if (finalAudio) fd.append('audio', finalAudio);

      if (chapterEditId) {
        await client.post(`/audiobook-chapters/${chapterEditId}`, fd);
      } else {
        await client.post(`/audiobooks/${selectedBook.id}/chapters`, fd);
      }
      await loadChapters(selectedBook);
      resetChapterForm();
      setShowChapterForm(false);
      await fetchBooks();
    } catch (e) { setChapterSaveError(formatApiError(e)); }
    finally { setChapterSaving(false); }
  }

  async function handleDeleteChapter(id) {
    try {
      await client.delete(`/audiobook-chapters/${id}`);
      setChapters(c => c.filter(x => x.id !== id));
      if (selectedBook) await fetchBooks();
    } catch (e) { alert(formatApiError(e)); }
    finally { setDeleteChapterId(null); }
  }

  const s = {
    page: { padding: '28px 24px', maxWidth: 960, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 },
    h1: { fontSize: 22, fontWeight: 800, color: 'var(--white)', margin: 0 },
    addBtn: { background: 'var(--emerald)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    card: { background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)', padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' },
    cardActive: { border: '1px solid rgba(34,197,94,.45)', background: 'rgba(34,197,94,.06)' },
    thumb: { width: 56, height: 56, borderRadius: 8, objectFit: 'cover', background: 'var(--bg-dark)', flexShrink: 0 },
    thumbFallback: { width: 56, height: 56, borderRadius: 8, background: 'rgba(212,168,67,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cardBody: { flex: 1, minWidth: 0 },
    title: { color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    meta: { color: 'var(--grey)', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' },
    badge: (pub) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: pub ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: pub ? '#22c55e' : '#ef4444', border: `1px solid ${pub ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}` }),
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: 'var(--grey)', fontSize: 13 },
    form: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--divider)', padding: 24, marginBottom: 24 },
    formTitle: { fontSize: 16, fontWeight: 800, color: 'var(--white)', margin: '0 0 18px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 600, color: 'var(--grey-light)' },
    input: { background: 'var(--bg-dark)', border: '1px solid var(--divider)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, outline: 'none' },
    textarea: { background: 'var(--bg-dark)', border: '1px solid var(--divider)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 72 },
    filePick: { background: 'var(--bg-dark)', border: '1px dashed var(--divider)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: 'var(--grey)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 },
    audioPreview: { marginTop: 6, width: '100%', borderRadius: 8, height: 36 },
    imgPreview: { marginTop: 6, width: 72, height: 72, objectFit: 'cover', borderRadius: 8 },
    row: { display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' },
    saveBtn: { background: 'var(--emerald)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    cancelBtn: { background: 'var(--bg-dark)', color: 'var(--grey)', border: '1px solid var(--divider)', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' },
    errMsg: { color: '#ef4444', fontSize: 12, marginTop: 10 },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
    modalBox: { background: 'var(--bg-card)', borderRadius: 14, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center' },
    section: { marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--divider)' },
    chapterCard: { background: 'var(--bg-dark)', borderRadius: 10, border: '1px solid var(--divider)', padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 },
    introBadge: { fontSize: 10, padding: '2px 7px', borderRadius: 12, background: 'rgba(212,168,67,.15)', color: '#d4a843', fontWeight: 700 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}>📚 Audio Books</h1>
        <button style={s.addBtn} onClick={openAddBook}>+ Add Book</button>
      </div>

      <ErrorBanner message={error} />

      {showBookForm && (
        <form ref={bookFormRef} style={s.form} onSubmit={handleSaveBook}>
          <p style={s.formTitle}>{bookEditId ? 'Edit Book' : 'New Audio Book'}</p>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} placeholder="Book title" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Author</label>
              <input style={s.input} value={bookForm.author} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" />
            </div>
          </div>
          <div style={{ ...s.field, marginTop: 14 }}>
            <label style={s.label}>Description</label>
            <textarea style={s.textarea} value={bookForm.description} onChange={e => setBookForm(f => ({ ...f, description: e.target.value }))} placeholder="About this book..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <div style={s.field}>
              <label style={s.label}>Sort Order</label>
              <input style={s.input} type="number" value={bookForm.sort_order} onChange={e => setBookForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Cover Image</label>
              <div style={s.filePick} onClick={() => coverRef.current?.click()}>
                🖼️ {coverFile ? coverFile.name : (existingCover ? 'Replace cover...' : 'Choose cover...')}
              </div>
              <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverPick} />
              {(coverPreview || existingCover) && (
                <img src={coverPreview || existingCover} alt="" style={s.imgPreview} />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <input type="checkbox" id="book-pub" checked={bookForm.is_published} onChange={e => setBookForm(f => ({ ...f, is_published: e.target.checked }))} />
            <label htmlFor="book-pub" style={{ ...s.label, cursor: 'pointer' }}>Published (visible in app)</label>
          </div>
          {bookSaveError && <p style={s.errMsg}>{bookSaveError}</p>}
          <div style={s.row}>
            <button type="button" style={s.cancelBtn} onClick={() => { resetBookForm(); setShowBookForm(false); }}>Cancel</button>
            <button type="submit" style={s.saveBtn} disabled={bookSaving}>{bookSaving ? 'Saving...' : (bookEditId ? 'Save Book' : 'Create Book')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--grey)', textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : books.length === 0 ? (
        <p style={{ color: 'var(--grey)', textAlign: 'center', padding: 40 }}>No audio books yet. Add one above.</p>
      ) : (
        books.map(b => (
          <div
            key={b.id}
            style={{ ...s.card, ...(selectedBook?.id === b.id ? s.cardActive : {}) }}
            onClick={() => loadChapters(b)}
          >
            {b.cover_image_url
              ? <img src={b.cover_image_url} alt="" style={s.thumb} />
              : <div style={s.thumbFallback}><span style={{ fontSize: 22 }}>📚</span></div>
            }
            <div style={s.cardBody}>
              <div style={s.title}>{b.title}</div>
              <div style={s.meta}>
                {b.author && <span>✍️ {b.author}</span>}
                <span>📖 {b.chapter_count ?? 0} chapters</span>
                <span style={s.badge(b.is_published)}>{b.is_published ? 'Published' : 'Draft'}</span>
              </div>
            </div>
            <button style={s.iconBtn} title="Edit" onClick={(e) => { e.stopPropagation(); openEditBook(b); }}>✏️</button>
            <button style={{ ...s.iconBtn, color: '#ef4444' }} title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteBookId(b.id); }}>🗑️</button>
          </div>
        ))
      )}

      {selectedBook && (
        <div style={s.section}>
          <div style={s.header}>
            <h2 style={{ ...s.h1, fontSize: 18 }}>Chapters — {selectedBook.title}</h2>
            <button style={s.addBtn} onClick={openAddChapter}>+ Add Chapter</button>
          </div>
          <p style={{ color: 'var(--grey)', fontSize: 12, marginBottom: 16 }}>
            Pehla chapter &quot;Introduction&quot; ke liye &quot;Is Introduction&quot; checkbox on karein.
          </p>

          {showChapterForm && (
            <form ref={chapterFormRef} style={s.form} onSubmit={handleSaveChapter}>
              <p style={s.formTitle}>{chapterEditId ? 'Edit Chapter' : 'New Chapter'}</p>
              <div style={s.grid2}>
                <div style={s.field}>
                  <label style={s.label}>Title *</label>
                  <input style={s.input} value={chapterForm.title} onChange={e => setChapterForm(f => ({ ...f, title: e.target.value }))} placeholder="Chapter title" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Chapter Number (optional)</label>
                  <input style={s.input} type="number" value={chapterForm.chapter_number} onChange={e => setChapterForm(f => ({ ...f, chapter_number: e.target.value }))} placeholder="1, 2, 3..." />
                </div>
              </div>
              <div style={{ ...s.field, marginTop: 14 }}>
                <label style={s.label}>Audio File {chapterEditId ? '(leave empty to keep)' : '*'}</label>
                <div style={s.filePick} onClick={() => audioRef.current?.click()}>
                  🎵 {audioFile ? audioFile.name : (existingAudioUrl ? 'Replace audio...' : 'Choose audio...')}
                </div>
                <input ref={audioRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioPick} />
                {audioFile && <AudioProcessor audioFile={audioFile} onProcessed={handleProcessed} />}
                {(audioPreviewUrl || existingAudioUrl) && (
                  <audio controls src={audioPreviewUrl || existingAudioUrl} style={s.audioPreview} />
                )}
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="intro" checked={chapterForm.is_introduction} onChange={e => setChapterForm(f => ({ ...f, is_introduction: e.target.checked }))} />
                  <label htmlFor="intro" style={{ ...s.label, cursor: 'pointer' }}>Is Introduction</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="ch-pub" checked={chapterForm.is_published} onChange={e => setChapterForm(f => ({ ...f, is_published: e.target.checked }))} />
                  <label htmlFor="ch-pub" style={{ ...s.label, cursor: 'pointer' }}>Published</label>
                </div>
              </div>
              {chapterSaveError && <p style={s.errMsg}>{chapterSaveError}</p>}
              <div style={s.row}>
                <button type="button" style={s.cancelBtn} onClick={() => { resetChapterForm(); setShowChapterForm(false); }}>Cancel</button>
                <button type="submit" style={s.saveBtn} disabled={chapterSaving}>{chapterSaving ? 'Uploading...' : (chapterEditId ? 'Save Chapter' : 'Add Chapter')}</button>
              </div>
            </form>
          )}

          {chaptersLoading ? (
            <p style={{ color: 'var(--grey)', textAlign: 'center', padding: 20 }}>Loading chapters...</p>
          ) : chapters.length === 0 ? (
            <p style={{ color: 'var(--grey)', textAlign: 'center', padding: 20 }}>No chapters yet. Add introduction first, then chapters.</p>
          ) : (
            chapters.map((c, i) => (
              <div key={c.id} style={s.chapterCard}>
                <span style={{ color: 'var(--grey)', fontSize: 12, width: 24 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>
                    {c.title}
                    {c.is_introduction && <span style={{ ...s.introBadge, marginLeft: 8 }}>INTRO</span>}
                  </div>
                  <div style={s.meta}>
                    {c.chapter_number != null && <span>Ch. {c.chapter_number}</span>}
                    {c.duration && <span>⏱ {formatDur(c.duration)}</span>}
                    {c.play_count > 0 && <span>▶ {c.play_count}</span>}
                  </div>
                </div>
                <button style={s.iconBtn} onClick={() => openEditChapter(c)}>✏️</button>
                <button style={{ ...s.iconBtn, color: '#ef4444' }} onClick={() => setDeleteChapterId(c.id)}>🗑️</button>
              </div>
            ))
          )}
        </div>
      )}

      {deleteBookId && (
        <div style={s.modal} onClick={() => setDeleteBookId(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <p style={{ color: 'var(--white)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Book?</p>
            <p style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 22 }}>All chapters will also be deleted.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={s.cancelBtn} onClick={() => setDeleteBookId(null)}>Cancel</button>
              <button style={{ ...s.saveBtn, background: '#ef4444' }} onClick={() => handleDeleteBook(deleteBookId)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteChapterId && (
        <div style={s.modal} onClick={() => setDeleteChapterId(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <p style={{ color: 'var(--white)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Chapter?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button style={s.cancelBtn} onClick={() => setDeleteChapterId(null)}>Cancel</button>
              <button style={{ ...s.saveBtn, background: '#ef4444' }} onClick={() => handleDeleteChapter(deleteChapterId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
