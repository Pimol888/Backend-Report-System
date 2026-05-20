const { getDb, updateDb } = require("../db");

function buildImageObject(file) {
  if (!file || !file.filename) return null;
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/meeting-notes/${file.filename}`,
  };
}

function buildImageFromUrl(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  return { url: url.trim() };
}

async function listMeetingNotes() {
  const db = await getDb();
  const notes = Array.isArray(db.meetingNotes) ? [...db.meetingNotes] : [];
  return notes.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function getMeetingNoteById(id) {
  const db = await getDb();
  const numId = Number(id);
  const note = (db.meetingNotes || []).find((n) => n.id === numId);
  return note || null;
}

async function createMeetingNote(payload, imageFile) {
  await updateDb(async (db) => {
    if (!Array.isArray(db.meetingNotes)) db.meetingNotes = [];
    if (typeof db.lastMeetingNoteId !== "number") db.lastMeetingNoteId = 0;
    const nextId = db.lastMeetingNoteId + 1;
    db.lastMeetingNoteId = nextId;

    const now = new Date().toISOString();
    const image = buildImageObject(imageFile) || buildImageFromUrl(payload.imageUrl) || null;
    const note = {
      id: nextId,
      date: String(payload.date).trim(),
      note: String(payload.note ?? "").trim(),
      image,
      createdAt: now,
      updatedAt: now,
    };
    db.meetingNotes.push(note);
  });

  const db = await getDb();
  return (db.meetingNotes || []).slice(-1)[0];
}

async function updateMeetingNote(id, payload, imageFile) {
  let updated = null;
  await updateDb(async (db) => {
    const numId = Number(id);
    const note = (db.meetingNotes || []).find((n) => n.id === numId);
    if (!note) return;
    if (payload.date !== undefined) note.date = String(payload.date).trim();
    if (payload.note !== undefined) note.note = String(payload.note).trim();
    if (payload.clearImage === true) note.image = null;
    else if (imageFile) note.image = buildImageObject(imageFile);
    else if (payload.imageUrl !== undefined) note.image = buildImageFromUrl(payload.imageUrl) || note.image;
    note.updatedAt = new Date().toISOString();
    updated = note;
  });
  return updated;
}

async function deleteMeetingNote(id) {
  let found = false;
  await updateDb(async (db) => {
    if (!Array.isArray(db.meetingNotes)) db.meetingNotes = [];
    const numId = Number(id);
    const idx = db.meetingNotes.findIndex((n) => n.id === numId);
    if (idx === -1) return;
    db.meetingNotes.splice(idx, 1);
    found = true;
  });
  return found;
}

module.exports = {
  listMeetingNotes,
  getMeetingNoteById,
  createMeetingNote,
  updateMeetingNote,
  deleteMeetingNote,
};
