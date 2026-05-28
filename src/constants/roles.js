/** System roles (stored in users.role) */
const ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin", // Head of Department (នាយកដ្ឋាន)
  ORG_ADMIN: "orgadmin", // Director General (អគ្គនាយកដ្ឋាន)
  SUPER_ADMIN: "superadmin", // DG, Department of Assembly and General Affairs
});

const ROLE_LABELS_KM = Object.freeze({
  [ROLES.USER]: "អ្នកប្រើប្រាស់",
  [ROLES.ADMIN]: "ប្រធាននាយកដ្ឋាន",
  [ROLES.ORG_ADMIN]: "អគ្គនាយកដ្ឋាន",
  [ROLES.SUPER_ADMIN]: "អគ្គនាយកដ្ឋានរដ្ឋបាល និងទីស្តីការគណៈរដ្ឋមន្ត្រី",
});

const STAFF_ROLES = new Set([ROLES.ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]);

const REVIEW_ROLES = new Set([ROLES.ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]);

function isStaffRole(role) {
  return STAFF_ROLES.has(role);
}

function isReviewerRole(role) {
  return REVIEW_ROLES.has(role);
}

module.exports = {
  ROLES,
  ROLE_LABELS_KM,
  STAFF_ROLES,
  REVIEW_ROLES,
  isReviewerRole,
  isStaffRole,
};
