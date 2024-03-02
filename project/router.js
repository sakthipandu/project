const express = require('express');
const controller = require('./controller')
const router = express.Router();

router.post('/createdata',controller.createDatabase);
router.post('/otpverify',controller.verifyToken,controller.verifyOTP);
router.get('/pdf/:name', controller.getPdf);
router.post('/clientlogin',controller.verifyToken,controller.login);
router.delete('/deletedb/:name',controller.deleteDb);
router.post('/addtable', controller.createTable);
// router.post('/addvalues', controller.createTable);

module.exports = router;