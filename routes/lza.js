const express = require('express');
const request = require('request');
const cors = require('cors');
const router = express.Router();
const http = require('http-debug').http;
http.debug = 2;

router.use(cors());

const LZA_ADDR = "10.10.103.12";
const LZA_PORT = "9089";

const simulatedNow = new Date('2019-05-31T12:00:00');

/*
 *  '/subnet' will return the status of all subnets. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 *
 */
router.get('/subnet', function(req, res, next) {

    const subnets = [];
    const fs = require('fs');
    fs.readdir( __dirname + '/../public/topology', (err, files) => {
        if (err) {
            throw err;
        }
        files.forEach(file => {
            subnets.push("'"+file.substring(0, file.length- 5)+"'");
        });
        const query = "SELECT mrid, category FROM SmartMeter NEARESTBEFORE NOW WHERE mrid IN (" + subnets + ") AND category LIKE 'Ersatzwert' LIMIT 1;";

        queryLZA(query)
            .then( (response) =>  {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ content: response}));
            })
            .catch((response) => res.send(response));
    });

});

/*
 *  '/subnet/past' will return the status of all subnets over the previous 12 hours. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 *
 */
router.get('/subnet/past/', function(req, res, next) {

    const minus12H = simulatedNow  - 60 * 60 * 12;

    const subnets = [];
    const fs = require('fs');
    fs.readdir( __dirname + '/../public/topology', (err, files) => {
        if (err) {
            throw err;
        }
        files.forEach(file => {
            subnets.push("'"+file.substring(0, file.length- 5)+"'");
        });
        const query = "SELECT mrid, category FROM SmartMeter["+minus12H+" : NOW] WHERE mrid IN (" + subnets + ") AND category LIKE 'Ersatzwert' LIMIT 1;";

        queryLZA(query)
            .then( (response) =>  {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ content: response}));
            })
            .catch((response) => res.send(response));
    });

});


/*
 *  '/subnet/:id' will return the status of all nodes of a subnet
 *
 */
router.get('/subnet/:id', function(req, res, next) {

    const smartMeterList = [];
    const fs = require('fs');

    //read topology to add all Gateways
    fs.readFile(__dirname + '/../public/topology/' + req.params.id + '.json', 'utf8', function (err, data) {
        if (err) {
            throw err;
        }

        let subnetTopology = JSON.parse(data);
        for (const gateway of subnetTopology.smgw) {
            for (const smartMeter of gateway.smartmeters) {
                smartMeterList.push("'"+smartMeter.id+"'");
            }
        }

        if (smartMeterList.length === 0){
            conole.error('No smarter meter found for topology: ' + req.params.id);
        }

        const query = "SELECT mrid, category FROM SmartMeter NEARESTBEFORE NOW WHERE mrid IN (" + smartMeterList + ") AND category LIKE 'Ersatzwert';";

        queryLZA(query)
            .then( (response) =>  {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ content: response}));
            })
            .catch((response) => res.send(response));

    });

});

/*
 *  '/meter/:id' will return the status of all nodes of a subnet, aggregated for the last 12 hours
 *
 */
router.get('/subnet/:id/past', function(req, res, next) {

    const minus12H = simulatedNow  - 60 * 60 * 12;

    const smartMeterList = [];
    const fs = require('fs');

    //read topology to add all Gateways
    fs.readFile(__dirname + '/../public/topology/' + req.params.id + '.json', 'utf8', function (err, data) {
        if (err) {
            throw err;
        }

        let subnetTopology = JSON.parse(data);
        for (const gateway of subnetTopology.smgw) {
            for (const smartMeter of gateway.smartmeters) {
                smartMeterList.push("'"+smartMeter.id+"'");
            }
        }

        if (smartMeterList.length === 0){
            conole.error('No smarter meter found for topology: ' + req.params.id);
        }

        const query = "SELECT mrid, category FROM SmartMeter["+minus12H+" : NOW] WHERE mrid IN (" + smartMeterList + ") AND category LIKE 'Ersatzwert';";

        queryLZA(query)
            .then( (response) =>  {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ content: response}));
            })
            .catch((response) => res.send(response));

    });
});

/*
 *  /meter/:id/days returns Smartmeter values vor the last day
 *
 */
router.get('/meter/:id/day/', function(req, res, next) {

    //FIXME: We need to be careful when selecting timestamps
    const fromTS = simulatedNow - 24 * 60 * 60;

    const query = "SELECT mrid, timestamp, value FROM SmartMeter ["+fromTS.getTime()+" : NOW] WHERE mrid ='" + req.params.id + "';";

    queryLZA(query)
        .then( (response) =>  {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: response}));
        })
        .catch((response) => res.send(response));

});

/*
 *  FIXME: Aggregation über IDs, nicht Zeitreihen möglich?
 *
 * /plausibility/subnet/:id returns all plausibilities within a given subnet per algorithm
 *
 */
router.get('/plausibility/subnet/:id', function(req, res, next) {

    //FIXME: We need to request and cache all subnet ids
    //var subnet = tdmCache.getSubnetIdsFor(req.params.id);

    const subnet = [];

    //FIXME: check for subnets (at least check if correct subnet was supplied)
    const fs = require('fs');

    //read topology to generate example values for each smartmeter
    fs.readFile(__dirname + '/../public/topology/' + req.params.id + '.json', 'utf8', function (err, data) {
        if (err) {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ error: err}));
            throw err;
        }

        let subnetTopology = JSON.parse(data);

        for (let i = 0; i < subnetTopology.smgw.length; i++) {
            //We will render smart meter gateways as the lowest layer for now
            for (let smartMeter of subnetTopology.smgw[i].smartmeters) {
                if (smartMeter.type === "producer") {
                    subnet.push("'" + smartMeter.id + "'");
                }
            }
        }

        const query = "SELECT mrid, plausibility_value, plausibility_source FROM SM_Plausibility NEARESTBEFORE NOW WHERE mrid IN (" + subnet + ");";

        queryLZA(query)
            .then( (response) =>  {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ content: response}));
            })
            .catch((response) => res.send(response));
    });

});


/*
 *  /plausibility/meter/:id/past returns plausibility for each algorithm for one SMGW in the given timespan which should be 24h
 *
 */
router.get('/plausibility/meter/:id/past', function(req, res, next) {

    const fromTS = simulatedNow - 60 * 60;

    const query = "SELECT mrid, timestamp, plausibility_value, plausibility_source FROM SM_Plausibility ["+Math.floor(fromTS.getTime() / 1000)+" : ISO(PT00H15M) : NOW] WHERE mrid ='" + req.params.id + "';";

    queryLZA(query)
        .then( (response) =>  {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: response}));
        })
        .catch((response) => res.send(response));

});


/*
 *  Plausbilität je Algo eines SMGWs NOW
 *
 *
 *
 */
router.get('/plausibility/meter/:id', function(req, res, next) {

    const query = "SELECT mrid, plausibility_value, plausibility_source FROM SM_Plausibility NEARESTBEFORE NOW WHERE mrid ='" + req.params.id + "';";

    queryLZA(query)
        .then( (response) =>  {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: response}));
        })
        .catch((response) => res.send(response));

});


/*
 *  /meter/:id/from/:from/to/:to returns Smartmeter values between from and to with a 1 hour resolution
 *
 *  TODO: Eventuelle Rückberechnung eines now ts - 1M statt "from"
 *  value eines SMGWs 1 Monat bei 1 M zwischen from/to
 *  values eines SMGWs 2 Monate for 13 Monaten zwischebn from/to
 */
router.get('/meter/:id/lastmonth/', function(req, res, next) {

    //FIXME: We need to be careful when selecting timestamps
    //FIXME: month != 30 days
    const fromTS = new Date(simulatedNow - 24 * 60 * 60 * 30 * 1000);
    const toTS = new Date(simulatedNow); //simulatedNow instead of NOW since we do the same in /meter/:id/pastmonth

    const query = "SELECT mrid, timestamp, value FROM SmartMeter ["+fromTS.getTime() / 1000+" : ISO(PT01H00M) : "+toTS.getTime() / 1000+"] WHERE mrid ='" + req.params.id + "';";

    queryLZA(query)
        .then( (response) =>  {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: response}));
        })
        .catch((response) => res.send(response));

});

/*
 *  /meter/:id/pastmonth returns Smartmeter values between 13 and 11 month ago (2 month) with a 1 hour resolution
 *
 *  values eines SMGWs 2 Monate for 13 Monaten zwischebn from/to
 */
router.get('/meter/:id/pastmonth', function(req, res, next) {

    //FIXME: We need to be careful when selecting timestamps
    //FIXME: month != 30 days
    const fromTS =  new Date(simulatedNow - 24 * 60 * 60 * 30 * 13 * 1000);
    const toTS =  new Date(simulatedNow - 24 * 60 * 60 * 30 * 11 * 1000);

    const query = "SELECT mrid, timestamp, value FROM SmartMeter ["+fromTS.getTime() / 1000+" : ISO(PT01H00M) : "+toTS.getTime() / 1000+"] WHERE mrid ='" + req.params.id + "';";

    queryLZA(query)
        .then( (response) =>  {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: response}));
        })
        .catch((response) => res.send(response));

});


/*
 *  /weather/:location/ returns the weather of past 24 hours 30 Minute resolution
 *
 * Attention! temperature and globalRadiation will be added in individual CSV-lines
 *
 * wetter eines SMGWs 24h
 */
router.get('/weather/:location', function(req, res, next) {

    //FIXME: We need to be careful when selecting timestamps
    const fromTS = Math.floor(((simulatedNow) / 1000) - 24 * 60 * 60);
    const toTS = Math.floor((simulatedNow.getTime()) / 1000);

    const query = "SELECT towndetail_name, kind, timestamp, value FROM Weather["+fromTS+":"+toTS+"] WHERE towndetail_name = '"+req.params.location+"' AND type = 'weather'";

    const HEADER = "location;category;timestamp;unit_multiplier;unit;value\n";

    queryLZA(query)
        .then( (response) =>  {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: response}));
        })
        .catch((response) => res.send(response));

});



/*
 *  /test/ tests the lza API
 *
 *
 *  FIXME: This function will cause the express-server to crash when adress not reachable
 */
router.get('/test/', function(front_req, front_res, front_next) {

    var anfragesprache = "SELECT towndetail_name, kind, timestamp, value FROM Weather WHERE towndetail_name = 'Oldenburg' AND year = 2018 AND type = 'weather' AND kind = 'ambientTemperature'";

    queryLZA(anfragesprache)
        .then( (response) => front_res.send(response))
        .catch((response) => front_res.send(response));

});

async function queryLZA(request) {
    return new Promise(function (resolve, reject) {
        const options = {
            host: LZA_ADDR,
            port: LZA_PORT,
            path: "/tsql/v1",
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'User-Agent': 'IMIS-Middleware',
                'Content-Length': request.length
            }
        };

        try {
            http.request(options, function (back_res) {
                var responseString = "";

                back_res.on("data", function (data) {
                    responseString += data;
                    // save all the data from response
                });
                back_res.on("end", function () {
                    if (responseString.includes('InvalidQueryException')){
                        console.error(responseString);
                        reject(responseString);
                    } else {
                        resolve(responseString);
                    }
                });
            }).write(request);
        } catch (error) {
            // This is not catching the error...
            console.error(error);
            reject(error);
        }

    });
}

/*
 *  Operateur schreibt Wert zurück
 */

module.exports = router;
