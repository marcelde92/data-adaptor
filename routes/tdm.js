var express = require('express');
var router = express.Router();


/*
 *  Returns mid-current grid with references to all subnets
 */
router.use('/overview', function (req, res, next) {
    console.log('Request Id:', req.params.id);
    res.download('./public/topology/mv-topology.json')
});


/*
 *  Returns the subnet with a given ID
 */
router.use('/:id', function (req, res, next) {
    console.log('Request Id:', req.params.id);
    res.download('./public/topology/' + req.params.id + '.json')
});

module.exports = router;
