const express = require("express");
const {test, balance, swap} = require("../controllers/UniswapController");
const {check, validationResult} = require("express-validator");
const router = express.Router();

swapValidate = [
    check("from").trim().escape().not().isEmpty(),
    check("to").trim().escape().not().isEmpty(),
    check("value").isFloat(), (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({errors: errors.array()});
        next();
    },]

balanceValidate = [
    check("symbol").trim().escape().not().isEmpty().isLength({min: 3}), (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({errors: errors.array()});
        next();
    },]

router.get('/swap', swapValidate, swap);

router.get('/balance', balanceValidate, balance);



module.exports = router;
