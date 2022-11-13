const express = require("express");
const {balance, buy, swap} = require("../controllers/SunController");
const router = express.Router();

router.route('/swap',).get(swap);

router.route('/balance').get(balance)

router.route('/buy').get(buy)


module.exports = router;
