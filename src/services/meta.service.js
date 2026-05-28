const departmentModel = require("../models/department.model");
const generalDirectorateModel = require("../models/generalDirectorate.model");
const userModel = require("../models/user.model");
const { resolveListScope } = require("../utils/scope");

async function getMetaData(auth) {
  const scope = resolveListScope(auth);
  const [teamMembers, departments, generalDirectorates] = await Promise.all([
    userModel.listTeamMembers(scope),
    departmentModel.listDepartments(scope),
    generalDirectorateModel.listGeneralDirectorates(scope),
  ]);
  return { teamMembers, departments, generalDirectorates };
}

module.exports = { getMetaData };
