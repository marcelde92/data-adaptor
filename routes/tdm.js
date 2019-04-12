var express = require('express');
var cors = require('cors')
var router = express.Router();

router.use();

/*
 *  Returns mid-current grid with references to all subnets
 */
router.use('/overview', function (req, res, next) {
    console.log('Request Id:', req.params.id);

    let topologyList = [];

    //requiring path and fs modules
    const path = require('path');
    const fs = require('fs');
    //joining path of directory
    const directoryPath = path.join(__dirname, '../public/topology');
    //passsing directoryPath and callback function
        fs.readdir(directoryPath, function (err, files) {
            //handling error
            if (err) {
                console.log('Unable to scan directory: ' + err);
            } else {
                //listing all files using forEach
                files.forEach(function (filename) {
                    topologyList.push(filename.replace(/\.[^/.]+$/, ""));
                });
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({content: JSON.stringify(topologyList)}));
            }
        });
});

/*
 *  Returns the subnet with a given ID
 */
router.use('/:id', function (req, res, next) {
    console.log('Request Id:', req.params.id);
    //res.download('./public/topology/' + req.params.id + '.json')

    var fs = require('fs');
    fs.readFile( __dirname + '/../public/topology/' + req.params.id + '.json','utf8', function (err, data) {
        if (err) {
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ error: {code: 404, message: 'Subnet with id: ' + req.params.id + ' could not be retrieved'}}));
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({content: JSON.stringify(data)}));
        }
    });
});

module.exports = router;
