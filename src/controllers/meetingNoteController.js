const { HttpError } = require("../utils/httpError");
const {
  validateCreateMeetingNote,
  validateUpdateMeetingNote,
} = require("../validators/meetingNoteValidators");
const {
  listMeetingNotes,
  getMeetingNoteById,
  createMeetingNote,
  updateMeetingNote,
  deleteMeetingNote,
} = require("../services/meetingNoteService");

async function list(req, res) {
  const meetingNotes = await listMeetingNotes();
  return res.json({ success: true, data: { meetingNotes } });
}

async function getById(req, res) {
  const note = await getMeetingNoteById(req.params.id);
  if (!note) throw new HttpError(404, "Meeting note not found");
  return res.json({ success: true, data: { meetingNote: note } });
}

async function create(req, res) {
  const validation = validateCreateMeetingNote(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const meetingNote = await createMeetingNote(validation.value, req.file);
  return res.status(201).json({
    success: true,
    message: "Meeting note created",
    data: { meetingNote },
  });
}

async function update(req, res) {
  const validation = validateUpdateMeetingNote(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const meetingNote = await updateMeetingNote(
    req.params.id,
    validation.value,
    req.file
  );
  if (!meetingNote) throw new HttpError(404, "Meeting note not found");
  return res.json({
    success: true,
    message: "Meeting note updated",
    data: { meetingNote },
  });
}

async function remove(req, res) {
  const found = await deleteMeetingNote(req.params.id);
  if (!found) throw new HttpError(404, "Meeting note not found");
  return res.json({ success: true, message: "Meeting note deleted" });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
