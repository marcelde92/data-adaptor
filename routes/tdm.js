var express = require('express');
var router = express.Router();


router.use('/:id', function (req, res, next) {
    console.log('Request Id:', req.params.id);
    res.download('./public/topology/' + req.params.id + '.json')
});

module.exports = router;
