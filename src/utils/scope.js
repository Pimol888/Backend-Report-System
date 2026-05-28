const { ROLES } = require("../constants/roles");
const { HttpError } = require("./httpError");

/** Filters for list endpoints (reports, meta, team members). */
function resolveListScope(auth) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return { departmentId: null, generalDirectorateId: null };
  }
  if (auth.role === ROLES.ORG_ADMIN) {
    return { departmentId: null, generalDirectorateId: auth.generalDirectorateId || null };
  }
  return { departmentId: auth.departmentId || null, generalDirectorateId: null };
}

function authFilters(auth) {
  const scope = resolveListScope(auth);
  const filters = {};
  if (scope.departmentId) filters.departmentId = scope.departmentId;
  if (scope.generalDirectorateId) filters.generalDirectorateId = scope.generalDirectorateId;
  return filters;
}

function assertCanAccessReport(auth, report) {
  if (auth.role === ROLES.SUPER_ADMIN) return;

  if (auth.role === ROLES.ORG_ADMIN) {
    if (!auth.generalDirectorateId || auth.generalDirectorateId !== report.generalDirectorateId) {
      throw new HttpError(403, "Cannot access report outside your general directorate");
    }
    return;
  }

  if (auth.role === ROLES.ADMIN) {
    if (!auth.departmentId || auth.departmentId !== report.departmentId) {
      throw new HttpError(403, "Cannot access report outside your department");
    }
    return;
  }

  if (auth.departmentId && auth.departmentId !== report.departmentId) {
    throw new HttpError(403, "Cannot access report outside your department");
  }
}

module.exports = {
  assertCanAccessReport,
  authFilters,
  resolveListScope,
};
