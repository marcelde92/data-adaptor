const express = require('express');
const request = require('request');
const cors = require('cors');
const router = express.Router();
const http = require('http-debug').http;
http.debug = 2;

router.use(cors());

const LZA_ADDR = 'IP_OF_THE_LZA_SERVER';
const LZA_PORT = 'PORT_OF_THE_LZA_SERVER';

const simulateMissingData = true;
const simulatedGridFailures = ['a7de7692-e2d5-49f0-a116-8d2cb525a05a', 'a0c0fabd-e157-4735-908e-af6ee71d199a'];
const simulatedGatewayFailures = [
    /* grid in which gateways can be failing*/
    'a3435eb8-df9d-47d6-9870-740d12b063f3',
    /* the failing gateways */
    'ebba1299-5cab-417b-8404-3773b21a6be7', 'e2f6fca5-4e74-4e35-a765-3e189fdd0e6c'];


//FIXME: Generate list of all queries with explanation for OFFIS and Kisters

/*
 *  '/subnet' will return the status of all subnets. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 *
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
    //res.render('debug', { content: queries });

    const HEADER = "mrid;category\n";

    var fs = require('fs');
    fs.readFile( __dirname + '/../public/CSV/01_category_agg-status_nearest.csv','utf8', function (err, data) {
        if (err) {
            throw err;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ content: HEADER + data}));
    });


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
 *  '/subnet/past' will return the status of all subnets over the previous 12 hours. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 *
 */
router.get('/subnet/past/', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnets = tdmCache.getAllSubnetIds();
    var subnets = {
        'subnet1' : ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'],
        'subnet2' : ['SMA1', 'SMA2', 'SMA3', 'SMA4', 'SMA5', 'SMA6']
    };

    var minus12H = new Date()  - 60 * 60 * 12;

    var queries = [];
    for (key in subnets) {
        var subnet = subnets[key];
        //FIXME: "Ersatzwert needs to be part of an ENUM
        queries.push("SELECT mrid, category FROM SmartMeter["+minus12H+" : NOW] WHERE mrid IN (" + subnet + ") AND category LIKE 'Ersatzwert' LIMIT 1;");
    }

    //FIXME: Debug
    //res.render('debug', { content: queries });

    const HEADER = "mrid;category\n";

    var fs = require('fs');
    fs.readFile( __dirname + '/../public/CSV/02_category_subnet-status_12hrs.csv','utf8', function (err, data) {
        if (err) {
            throw err;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ content: HEADER + data}));
    });


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
 *  '/subnet/:id' will return the status of all nodes of a subnet
 *
 */
router.get('/subnet/:id', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnet = tdmCache.getSubnetIdsFor(req.params.id);
    var subnet = ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'];

    var queries = [];
    //FIXME: "Ersatzwert needs to be part of an ENUM
    queries.push("SELECT mrid, category FROM SmartMeter NEARESTBEFORE NOW WHERE mrid IN (" + subnet + ") AND category LIKE 'Ersatzwert';");


    //FIXME: Debug
    //res.render('debug', { content: queries });

    const HEADER = "mrid;category\n";
    const fs = require('fs');
    if (req.params.id == 'fff76033-6ed2-4296-90c0-ed682a68b6ec') {
        fs.readFile( __dirname + '/../public/CSV/03_category_allSM-Status_nearest.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        //read topology to generate example values for each smartmeter
        fs.readFile(__dirname + '/../public/topology/' + req.params.id + '.json', 'utf8', function (err, data) {
            if (err) {
                throw err;
            }

            let subnetTopology = JSON.parse(data);

            let statusList = [];
            if (simulateMissingData && (simulatedGridFailures.includes(req.params.id) || simulatedGatewayFailures.includes(req.params.id))) {
                for (const gateway of subnetTopology.smgw) {
                    // We check if a failure should be simulated
                    if (simulateMissingData && (simulatedGatewayFailures.includes(gateway.id) || simulatedGridFailures.includes(req.params.id)) ) {
                        for (const smartMeter of gateway.smartmeters) {
                            statusList.push({
                                mrid: smartMeter.id,
                                category: 'Ersatzwert'
                            });
                        }
                    }
                }
            }

            let csvString = HEADER;
            for (let element of statusList){
                csvString += element.mrid + ";" + element.category + "\n";
            }

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({content: csvString}));
        });
    }

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
 *  '/meter/:id' will return the status of all nodes of a subnet, aggregated for the last 12 hours
 *
 */
router.get('/subnet/:id/past', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnet = tdmCache.getSubnetIdsFor(req.params.id);
    var subnet = ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'];

    var minus12H = new Date()  - 60 * 60 * 12;

    var queries = [];
    //FIXME: "Ersatzwert needs to be part of an ENUM
    queries.push("SELECT mrid, category FROM SmartMeter["+minus12H+" : NOW] WHERE mrid IN (" + subnet + ") AND category LIKE 'Ersatzwert';");

    //FIXME: Debug
    //res.render('debug', { content: queries });

    const HEADER = "mrid;category\n";

    if (req.params.id == 'fff76033-6ed2-4296-90c0-ed682a68b6ec') {
        var fs = require('fs');
        fs.readFile( __dirname + '/../public/CSV/04_category_allSM-Status_12hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: {code: 404, message: 'Subnet id was not found'}}));
    }

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
 *  /meter/:id/days returns Smartmeter values vor the last day
 *
 */
router.get('/meter/:id/day/', function(req, res, next) {

    //FIXME: We need to be careful when selecting timestamps
    var fromTS = new Date() - 24 * 60 * 60;

    var queries = [];
    queries.push("SELECT mrid, timestamp, value FROM SmartMeter ["+fromTS+" : NOW] WHERE mrid =" + req.params.id + ";");

    //FIXME: Debug
    //res.render('debug', { content: queries });

    const HEADER = "mrid;timestamp;value\n";

    if (req.params.id == 'c41daf96-f387-4098-bd23-fce1f32bf9d4') {
        var fs = require('fs');
        fs.readFile( __dirname + '/../public/CSV/05_sm_meas_24hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        fs.readFile( __dirname + '/../public/CSV/simulation/05_sm_meas_24hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            data = data.replace(new RegExp('MRID', 'g'), req.params.id);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    }

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
 * /plausibility/subnet/:id returns all plausibilities within a given subnet per algorithm
 *
 */
router.get('/plausibility/subnet/:id', function(req, res, next) {

    //FIXME: We need to request amd cache all subnet ids
    //var subnet = tdmCache.getSubnetIdsFor(req.params.id);
    //var subnet = ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6'];

    //var queries = [];
    //FIXME: "Ersatzwert needs to be part of an ENUM
    //queries.push("SELECT plausibility_value, plausibility_source, mrid FROM SM_Plausibility NEARESTBEFORE NOW WHERE mrid IN (" + subnet + ");");

    const HEADER = "mrid;plausibility_value;plausibility_source\n";

    //FIXME: for simjulation we need to read the topologies SM-List - this can't be faked using the csv files

    //FIXME: check for subnets (at least check if correct subnet was suplied)
    const fs = require('fs');
    if (req.params.id == 'fff76033-6ed2-4296-90c0-ed682a68b6ec') {
        fs.readFile(__dirname + '/../public/CSV/07_plausi_subnet-status_nearest.csv', 'utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({content: HEADER + data}));
        });
    } else {
        //read topology to generate example values for each smartmeter
        fs.readFile(__dirname + '/../public/topology/' + req.params.id + '.json', 'utf8', function (err, data) {
            if (err) {
                throw err;
            }
            
            let subnetTopology = JSON.parse(data);

            let plausibilityList = [];
            for (let i = 0; i < subnetTopology.smgw.length; i++) {
                //We will render smart meter gateways as the lowest layer for now
                for (let smartMeter of subnetTopology.smgw[i].smartmeters) {
                    if (smartMeter.type == "producer") {
                        // FIXME: here we should read values from the cache instead of generating them randomly between 40% and 100% percent
                        plausibilityList.push({
                            id : smartMeter.id,
                            plausibility: Math.floor(((Math.random() * 60) + 40)) / 100,
                            type: 'historical'});
                        plausibilityList.push({
                            id: smartMeter.id,
                            plausibility: Math.floor(((Math.random() * 60) + 40)) / 100,
                            type: 'weather'});
                    }
                }
            }

            let csvString = HEADER;
            for (let element of plausibilityList){
                csvString += element.id + ";" + element.plausibility + ";" + element.type + "\n";
            }

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({content: csvString}));
        });
    }

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
 *  /plausibility/meter/:id/past returns plausibility for each algorithm for one SMGW in the given timespan which should be 24h
 *
 */
router.get('/plausibility/meter/:id/past', function(req, res, next) {
    //FIXME: TimeResolution ISO 15 Minuten (ISO kontrollieren)
    //FIXME: Middlewear should set from data
    var queries = [];
    var fromTS = new Date() - 60 * 60;

    //from/1515024000/to/1515110399
    //queries.push("SELECT mrid, timestamp, plausibility_value, plausibility_source FROM SM_Plausibility ["+fromTS+" : ISO(PT00H15M) : NOW] WHERE mrid =" + req.params.id + ";");

    //FIXME: Debug
    //res.render('debug', { content: queries });

    const HEADER = "mrid;timestamp;plausibility_value;plausibility_source\n";
    const fs = require('fs');

    if (req.params.id == 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
        fs.readFile( __dirname + '/../public/CSV/08_plausi_sm_24hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else if (simulateMissingData){
        fs.readFile( __dirname + '/../public/CSV/simulation/08_plausi_sm_24hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            data = data.replace(new RegExp('MRID', 'g'), req.params.id);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: {code: 404, message: 'Smart meter id was not found'}}));
    }

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

    //var queries = [];
    //queries.push("SELECT mrid, plausibility_value, plausibility_source FROM SM_Plausibility NEARESTBEFORE NOW WHERE mrid =" + req.params.id + ";");

    //FIXME: Debug
    //res.render('debug', { content: queries });
    console.log(req);
    console.log(req.params);

    const HEADER = "mrid;plausibility_value;plausibility_source\n";
    const fs = require('fs');
    if (req.params.id == 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
        fs.readFile( __dirname + '/../public/CSV/06_plausi_sm-status_nearest_SMe91a.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else if (simulateMissingData){
        fs.readFile( __dirname + '/../public/CSV/simulation/06_plausi_sm-status_nearest.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            data = data.replace('MRID', req.params.id);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: {code: 404, message: 'Smart meter id was not found'}}));
    }
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
router.get('/meter/:id/lastmonth/', function(req, res, next) {

    //FIXME: We need to be careful when selecting timestamps
    //FIXME: month != 30 days
    //var fromTS = new Date() - 24 * 60 * 60 * 30;
    //var toTS = + new Date(); //Date() instead of NOW since we do the same in /meter/:id/pastmonth

    //var queries = [];
    //queries.push("SELECT mrid, timestamp, value FROM SmartMeter ["+fromTS+" : ISO(PT01H00M) : "+toTS+"] WHERE mrid =" + req.params.id + ";");

    //FIXME: Debug
    //res.render('debug', { content: queries });

    const HEADER = "mrid;timestamp;value\n";
    const fs = require('fs');
    if (req.params.id == 'd6474feb-d37a-405c-b16b-5e39138355d0') {
        fs.readFile( __dirname + '/../public/CSV/09_last_month_hourly.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else if (req.params.id == 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
        fs.readFile( __dirname + '/../public/CSV/09_last_month_hourly_SMe91a.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else if (simulateMissingData){
        fs.readFile( __dirname + '/../public/CSV/simulation/09_last_month_hourly.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            data = data.replace('MRID', req.params.id);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: {code: 404, message: 'Smart meter id was not found'}}));
    }

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
 *  /meter/:id/pastmonth returns Smartmeter values between 13 and 11 month ago (2 month) with a 1 hour resolution
 *
 *  values eines SMGWs 2 Monate for 13 Monaten zwischebn from/to
 */
router.get('/meter/:id/pastmonth', function(req, res, next) {

    //FIXME: We need to be careful when selecting timestamps
    //FIXME: month != 30 days
    var fromTS = new Date() - 24 * 60 * 60 * 30 * 13;
    var toTS = new Date() - 24 * 60 * 60 * 30 * 11;

    var queries = [];
    queries.push("SELECT mrid, timestamp, value FROM SmartMeter ["+fromTS+" : ISO(PT01H00M) : "+toTS+"] WHERE mrid =" + req.params.id + ";");

    //FIXME: Debug
    //res.render('debug', { content: queries });

    const HEADER = "mrid;timestamp;value\n";

    if (req.params.id == 'd6474feb-d37a-405c-b16b-5e39138355d0') {
        var fs = require('fs');
        fs.readFile( __dirname + '/../public/CSV/10_last_two_month_hourly.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else if (req.params.id == 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
        var fs = require('fs');
        fs.readFile( __dirname + '/../public/CSV/10_last_two_month_hourly-SMe91a.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: {code: 404, message: 'Smart meter id was not found'}}));
    }

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
 *  /weather/:location/ returns the weather of past 24 hours 30 Minute resolution
 *
 * Attention! temperature and globalRadiation will be added in individual CSV-lines
 *
 * wetter eines SMGWs 24h
 */
router.get('/weather/:location', function(req, res, next) {

    //FIXME: remove this when data is available for current period
    let lastYearREMOVETHIS = 365 * 24 * 60 * 60;

    //FIXME: We need to be careful when selecting timestamps
    const fromTS = Math.floor(((new Date()) / 1000) - 24 * 60 * 60 - lastYearREMOVETHIS);
    const toTS = Math.floor((new Date().getTime()) / 1000 - lastYearREMOVETHIS);

    const query = "SELECT towndetail_name, kind, timestamp, value FROM Weather["+fromTS+":"+toTS+"] WHERE towndetail_name = '"+req.params.location+"' AND year = 2018 AND type = 'weather' AND kind = 'ambientTemperature'";

    const HEADER = "location;category;timestamp;unit_multiplier;unit;value\n";


    queryLZA(query)
        .then( (response) =>  {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + response}));
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
            host: "10.10.103.12",
            port: "9089",
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
