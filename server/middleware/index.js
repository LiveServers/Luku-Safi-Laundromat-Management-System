module.exports = {
    ...require("./auth"),
    ...require("./requireOwner"),
    ...require("./requireManager")
};
