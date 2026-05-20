/** Active categories shown in the ticket form. Inactive ones are hidden. */
const CATEGORIES = [
  { id: "internet", name: "Internet", active: true },
  { id: "email", name: "Email", active: true },
  { id: "wifi", name: "Wifi", active: true },
  { id: "tech_device", name: "Tech Device", active: true },
  { id: "other", name: "Others", active: true },
];

function getActiveCategories() {
  return CATEGORIES.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }));
}

function getAllCategories() {
  return CATEGORIES.map((c) => ({ id: c.id, name: c.name, active: c.active }));
}

module.exports = {
  CATEGORIES,
  getActiveCategories,
  getAllCategories,
};
