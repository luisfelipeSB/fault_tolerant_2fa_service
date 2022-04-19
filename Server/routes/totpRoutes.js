var express = require('express');
var router = express.Router();
var tModel = require("../models/totpModel");

router.get('/users', async function(req, res, next) {
    let result = await tModel.getUsers();
    res.status(result.status).send(result.result);
});

router.put('/updatetokens', async function(req, res, next) {
    let result = await tModel.updateTokens();
    res.status(result.status).send(result.result);
});

router.get('/verifysecret/:secret', async function(req, res, next) {
    let secret = req.params.secret;
    let result = await tModel.verifySecret(secret);
    res.status(result.status).send(result.result);
});

module.exports = router;