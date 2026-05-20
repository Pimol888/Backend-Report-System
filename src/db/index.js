const driver = (process.env.DB_DRIVER || "mysql").toLowerCase();
const useFile = driver === "file" || driver === "json";

module.exports = useFile ? require("./fileDb") : require("./mysqlDb");
