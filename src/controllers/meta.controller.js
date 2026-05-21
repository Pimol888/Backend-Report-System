const metaService = require("../services/meta.service");

async function teamMembers(req, res) {
  const data = await metaService.getMetaData(req.auth);
  res.json({ success: true, data: data.teamMembers });
}

async function departments(req, res) {
  const data = await metaService.getMetaData(req.auth);
  res.json({ success: true, data: data.departments });
}

async function generalDirectorates(req, res) {
  const data = await metaService.getMetaData(req.auth);
  res.json({ success: true, data: data.generalDirectorates });
}

module.exports = {
  departments,
  generalDirectorates,
  teamMembers,
};
