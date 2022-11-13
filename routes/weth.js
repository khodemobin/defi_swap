const express = require("express");
const {deposit, withdraw, balance} = require("../controllers/Weth9Controller");
const router = express.Router();
const {query, validationResult} = require('express-validator');

validate = [query("value").isFloat(), (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({errors: errors.array()});
    next();
},]

router.get('/balance', balance)

router.get('/deposit', validate, deposit)

router.get('/withdraw', validate, withdraw)


module.exports = router;
