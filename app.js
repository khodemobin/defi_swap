const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const ethRouter = require('./routes/weth');
const sunRouter = require('./routes/sun');
const uniswapRouter = require('./routes/uniswap');

const app = express();

function ignoreFavicon(req, res, next) {
 next();
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use("/eth", ethRouter);
app.use("/sun", sunRouter);
app.use("/uniswap", uniswapRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    res.json({
        message: err.message,
        error: err
    });
});


module.exports = app;
