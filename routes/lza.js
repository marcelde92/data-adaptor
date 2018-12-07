var express = require('express');
var request = require('request');
var router = express.Router();

var lzaAddr = 'IP_OF_THE_LZA_SERVER'
var lzaPort = 'PORT_OF_THE_LZA_SERVER'

/*
 *  '/subnet' will return the status of all subnets. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 */
router.get('/subnet', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnets = tdmCache.getAllSubnetIds();
    var subnets = {
        'subnet1' : ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'],
        'subnet2' : ['SMA1', 'SMA2', 'SMA3', 'SMA4', 'SMA5', 'SMA6']
    };

    var queries = [];
    for (subnet of subnets) {
        //FIXME: "Ersatzwert needs to be part of an ENUM
        //FIXME: We propably need to replace "NOW" with the current time
        queries.push("SELECT mrid, category FROM SmartMeter NEARESTBEFORE NOW WHERE mrid IN (" + subnet + ") AND category LIKE “Ersatzwert” LIMIT 1");
    }

    request({
        uri: lzaAddr + ':' + lzaPort,
        qs: {
            query: queries
        }
    }).pipe(res);
});


module.exports = router;
