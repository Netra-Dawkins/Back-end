const {param} = require("express-validator")

function checkParamId() {
    param('id')
        .notEmpty()
        .withMessage('id is required')
        .isMongoId()
        .withMessage('id needs to be a mongodb id')
}

module.exports = {
    checkParamId
}