var express = require('express');
var request = require('request');
var router = express.Router();

var LZA_ADDR = 'IP_OF_THE_LZA_SERVER'
var LZA_PORT = 'PORT_OF_THE_LZA_SERVER'

/*
 *  '/subnet' will return the status of all subnets. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 *
 *  FIXME: OFFIS: Können wir mehrere Queries gestackt senden?
 */
router.get('/subnet', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnets = tdmCache.getAllSubnetIds();
    var subnets = {
        'subnet1' : ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'],
        'subnet2' : ['SMA1', 'SMA2', 'SMA3', 'SMA4', 'SMA5', 'SMA6']
    };

    var queries = [];
    for (key in subnets) {
        var subnet = subnets[key];
        //FIXME: "Ersatzwert needs to be part of an ENUM
        queries.push("SELECT mrid, category FROM SmartMeter NEARESTBEFORE NOW WHERE mrid IN (" + subnet + ") AND category LIKE 'Ersatzwert' LIMIT 1;");
    }

    //FIXME: Debug
    res.render('debug', { content: queries });

    /*
    request({
        uri: LZA_ADDR + ':' + LZA_PORT,
        qs: {
            query: queries
        }
    }).pipe(res);
    */
});


/*
 *  '/meter/:id' will return the status of all nodes of a subnet
 *
 */
router.get('/meter/:id', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnet = tdmCache.getSubnetIdsFor(req.params.id);
    var subnet = ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'];

    var queries = [];
    //FIXME: "Ersatzwert needs to be part of an ENUM
    queries.push("SELECT mrid, category FROM SmartMeter NEARESTBEFORE NOW WHERE mrid IN (" + subnet + ") AND category LIKE 'Ersatzwert';");


    //FIXME: Debug
    res.render('debug', { content: queries });

    /*
    request({
        uri: LZA_ADDR + ':' + LZA_PORT,
        qs: {
            query: queries
        }
    }).pipe(res);
    */
});



/*
 *  FIXME: Aggregation über IDs, nicht Zeitreihen möglich?
 *
 * /plausibility/subnet/:id returns the average of all plausibilitiers within a given subnet per algorithm
 *
 */
router.get('/plausibility/subnet/:id', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnet = tdmCache.getSubnetIdsFor(req.params.id);
    var subnet = ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'];

    var queries = [];
    //FIXME: "Ersatzwert needs to be part of an ENUM
    queries.push("SELECT SM.mrid AS mrid, PL.plausibility_value AS pl-value, PL.plausibility_source AS pl-source FROM SmartMeter AS SM, SM_Plausibility AS PL NEARESTBEFORE NOW WHERE mrid IN (" + subnet + ");");

    //FIXME: manual aggregation here

    //FIXME: Debug
    res.render('debug', { content: queries });

    /*
     request({
     uri: LZA_ADDR + ':' + LZA_PORT,
     qs: {
     query: queries
     }
     }).pipe(res);
     */
});

/*
 *  Plausbilität je Algo eines SMGWs NOW
 *
 *
 *
 */
router.get('/plausibility/meter/:id', function(req, res, next) {

    var queries = [];
    queries.push("SELECT SM.mrid AS mrid, PL.plausibility_value AS pl-value, PL.plausibility_source AS pl-source FROM SmartMeter AS SM, SM_Plausibility AS PL NEARESTBEFORE NOW WHERE mrid =" + req.params.id + ";");


    //FIXME: Debug
    res.render('debug', { content: queries });

    /*
     request({
     uri: LZA_ADDR + ':' + LZA_PORT,
     qs: {
     query: queries
     }
     }).pipe(res);
     */
});


/*
 *  /plausibility/meter/:id/from/:from/to/:to returns plausibility for each algorithm for one SMGW in the given timespan which shoukd be 24h
 *  
 *  TODO: Eventuelle Rückberechnung eines now ts - 24h statt "from"
 *  FIXME: Frage OFFIS: PL.timestamp?
 */
router.get('/plausibility/meter/:id/from/:from/to/:to', function(req, res, next) {

    var queries = [];
    queries.push("SELECT SM.mrid AS mrid, PL.timestamp AS ts, PL.plausibility_value AS pl-value, PL.plausibility_source AS pl-source FROM SmartMeter AS SM, SM_Plausibility AS PL ["+req.params.from+" : "+ ((req.params.to - req.params.from) / 60*15)  +" : "+req.params.to+"] INTERPOLATE BY STAMPED-LEFT WHERE SM.mrid =" + req.params.id + " AND PL.mrid =" + req.params.id + ";");


    //FIXME: Debug
    res.render('debug', { content: queries });

    /*
     request({
     uri: LZA_ADDR + ':' + LZA_PORT,
     qs: {
     query: queries
     }
     }).pipe(res);
     */
});

/*
 *  /meter/:id/from/:from/to/:to returns Smartmeter values between from and to with a 1 hour resolution
 *
 *  TODO: Eventuelle Rückberechnung eines now ts - 1M statt "from"
 *  value eines SMGWs 1 Monat bei 1 M zwischen from/to
 *  values eines SMGWs 2 Monate for 13 Monaten zwischebn from/to
 */
router.get('/meter/:id/from/:from/to/:to', function(req, res, next) {

    var queries = [];
    queries.push("SELECT mrid, timestamp FROM SmartMeter ["+req.params.from+" : "+ ((req.params.to - req.params.from) / 60*60) +" : "+req.params.to+"] INTERPOLATE BY STAMPED-LEFT WHERE mrid =" + req.params.id + ";");


    //FIXME: Debug
    res.render('debug', { content: queries });

    /*
     request({
     uri: LZA_ADDR + ':' + LZA_PORT,
     qs: {
     query: queries
     }
     }).pipe(res);
     */
});


/*
 *  /weather/:location/from/:from/to/:to returns the weather data between from and to in 30 Minute resolution
 *
 * wetter eines SMGWs 24h
 */
router.get('/weather/:location/from/:from/to/:to', function(req, res, next) {

    var queries = [];
    queries.push("SELECT * FROM Weather ["+req.params.from+" : "+ ((req.params.to - req.params.from) / 60*30)  +" : "+req.params.to+"] INTERPOLATE BY STAMPED-LEFT WHERE location =" + req.params.location + ";");


    //FIXME: Debug
    res.render('debug', { content: queries });

    /*
     request({
     uri: LZA_ADDR + ':' + LZA_PORT,
     qs: {
     query: queries
     }
     }).pipe(res);
     */
});

/*
 *  Operateur schreibt Wert zurück
 */

module.exports = router;
