const { HttpError } = require("../utils/httpError");
const { validateUpsertCalendarNote } = require("../validators/calendarNoteValidators");
const {
  listCalendarNotes,
  getCalendarNoteByDate,
  upsertCalendarNote,
  deleteCalendarNote,
} = require("../services/calendarNoteService");

async function list(req, res) {
  const notes = await listCalendarNotes(req);
  return res.json({ success: true, data: { notes } });
}

async function getByDate(req, res) {
  const date = req.params.date;
  const note = await getCalendarNoteByDate(date, req);
  if (!note) throw new HttpError(404, "Calendar note not found");
  return res.json({ success: true, data: { note } });
}

async function createOrUpdate(req, res) {
  const validation = validateUpsertCalendarNote(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const { date, note, images } = validation.value;
  const saved = await upsertCalendarNote(date, { note, images }, req);
  return res.json({
    success: true,
    message: "Calendar note saved",
    data: { note: saved },
  });
}

async function remove(req, res) {
  const date = req.params.date;
  const found = await deleteCalendarNote(date, req);
  if (!found) throw new HttpError(404, "Calendar note not found");
  return res.json({ success: true, message: "Calendar note deleted" });
}

module.exports = {
  list,
  getByDate,
  createOrUpdate,
  remove,
};
