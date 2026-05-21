const departmentModel = require("../models/department.model");
const generalDirectorateModel = require("../models/generalDirectorate.model");
const userModel = require("../models/user.model");

async function getMetaData(auth) {
  const departmentFilter = auth.role === "superadmin" ? null : auth.departmentId;
  const [teamMembers, departments, generalDirectorates] = await Promise.all([
    userModel.listTeamMembers(departmentFilter),
    departmentModel.listDepartments(departmentFilter),
    generalDirectorateModel.listGeneralDirectorates(departmentFilter),
  ]);
  return { teamMembers, departments, generalDirectorates };
}

module.exports = { getMetaData };
