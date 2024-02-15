const express = require('express');
const controller = require('./controller')
const router = express.Router();

router.post('/createdata', controller.createDatabase);
router.post('/otpverify',controller.verifyOTP)
router.get('/pdf/:name', controller.getPdf)
router.post('/clintlogin',controller.login);

module.exports = router;