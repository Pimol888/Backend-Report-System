const PERMISSION_STATUSES = ["late", "leave_early", "absent", "out_of_office"];

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateCreatePermissionRequest(body) {
  const status = body?.status;
  if (!status || !PERMISSION_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `status is required and must be one of: ${PERMISSION_STATUSES.join(", ")}`,
    };
  }

  const reason = body?.reason;
  if (!isNonEmptyString(reason)) {
    return { ok: false, error: "reason is required" };
  }

  const value = { status, reason: String(reason).trim() };

  switch (status) {
    case "late": {
      const arrivalTime = body?.arrivalTime;
      if (!isNonEmptyString(arrivalTime)) {
        return { ok: false, error: "arrivalTime is required when status is late" };
      }
      value.arrivalTime = String(arrivalTime).trim();
      break;
    }
    case "leave_early": {
      const leaveTime = body?.leaveTime;
      if (!isNonEmptyString(leaveTime)) {
        return { ok: false, error: "leaveTime is required when status is leave_early" };
      }
      value.leaveTime = String(leaveTime).trim();
      break;
    }
    case "absent": {
      const fromDate = body?.fromDate;
      const toDate = body?.toDate;
      const totalDays = body?.totalDays;
      if (!isNonEmptyString(fromDate)) {
        return { ok: false, error: "fromDate is required when status is absent" };
      }
      if (!isNonEmptyString(toDate)) {
        return { ok: false, error: "toDate is required when status is absent" };
      }
      const numDays = Number(totalDays);
      if (!Number.isInteger(numDays) || numDays < 0) {
        return { ok: false, error: "totalDays is required and must be a non-negative integer when status is absent" };
      }
      value.fromDate = String(fromDate).trim();
      value.toDate = String(toDate).trim();
      value.totalDays = numDays;
      break;
    }
    case "out_of_office": {
      const startTime = body?.startTime;
      const endTime = body?.endTime;
      const location = body?.location;
      if (!isNonEmptyString(startTime)) {
        return { ok: false, error: "startTime is required when status is out_of_office" };
      }
      if (!isNonEmptyString(endTime)) {
        return { ok: false, error: "endTime is required when status is out_of_office" };
      }
      if (!isNonEmptyString(location)) {
        return { ok: false, error: "location is required when status is out_of_office" };
      }
      value.startTime = String(startTime).trim();
      value.endTime = String(endTime).trim();
      value.location = String(location).trim();
      break;
    }
    default:
      return { ok: false, error: "Invalid status" };
  }

  return { ok: true, value };
}

function validateApproveReject(body) {
  const approvalStatus = body?.approvalStatus;
  if (approvalStatus !== "approved" && approvalStatus !== "rejected") {
    return { ok: false, error: "approvalStatus is required and must be 'approved' or 'rejected'" };
  }
  return {
    ok: true,
    value: {
      approvalStatus,
      reviewComment: typeof body?.reviewComment === "string" ? body.reviewComment.trim() : "",
    },
  };
}

module.exports = {
  validateCreatePermissionRequest,
  validateApproveReject,
  PERMISSION_STATUSES,
};
