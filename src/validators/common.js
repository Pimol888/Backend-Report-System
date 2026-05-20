function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function optionalString(v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return null;
  return v;
}

module.exports = {
  isNonEmptyString,
  optionalString,
};

