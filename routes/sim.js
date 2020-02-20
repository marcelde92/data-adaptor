const express = require('express');
const cors = require('cors');
const router = express.Router();
const http = require('http-debug').http;
http.debug = 2;

router.use(cors());

const simulatedGridFailures = ['b2f02ef0-71e1-4660-8322-002ae02c69e7', 'a1c24288-4775-470b-87e6-77a68af36763', 'fd48f0ab-5a25-42d5-84f7-d0053b29fd71'];
const simulatedGatewayFailures = [
    /* grid in which gateways can be failing*/
    'fff76033-6ed2-4296-90c0-ed682a68b6ec', 'd6bd1f0e-28a3-48e6-85a6-ab501b8bfed7',
    /* the failing gateways */
    'a37cd3db-c601-4a95-aaff-7cf05f67c649', 'cb726ad0-43ea-4f2a-b500-9ad33b302498', 'f6a3d038-a75f-4665-8705-a3adf90cad33', 'afaeea5b-3438-461e-bc65-18e9aa56ca63', 'ca46d506-b794-4749-8eb8-449829736d28', 'c726976b-02d8-47f4-b2a6-5c3799b0cb6c', 'f52e769d-59fa-4357-9ca4-cac0f63e999b', 'd8c7f268-a058-4216-ad0c-1bcf1b22bec3', 'd3431250-8f98-4032-9a82-5f49aa9b75e9', 'aa8619d1-44d1-41c9-95c9-87f4b8fe95ca', 'fd0c9b18-be83-4596-9384-6e8a6bd00a4e', 'f036dcc4-2860-41d2-b7e1-4e3c83e78b83', 'b41467df-e2c4-4e3a-9e23-47de45002e60', 'b49330d3-ed7b-4dbc-b673-2059122e44bc', 'a94c3959-7a3a-4997-a64d-0ce23345d299'];



/*
 *  '/subnet' will return the status of all subnets. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 *
 */
router.get('/subnet', function(req, res, next) {

    const HEADER = "mrid;category\n";

    const fs = require('fs');
    fs.readFile( __dirname + '/../public/CSV/01_category_agg-status_nearest.csv','utf8', function (err, data) {
        if (err) {
            throw err;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ content: HEADER + data}));
    });

});

/*
 *  '/subnet/past' will return the status of all subnets over the previous 12 hours. Due to system architecture this requires a request for each subnet
 *
 *  FIXME: We should apply some kind of caching to prevent these massive requests
 *
 */
router.get('/subnet/past/', function(req, res, next) {

    const HEADER = "mrid;category\n";

    const fs = require('fs');
    fs.readFile( __dirname + '/../public/CSV/02_category_subnet-status_12hrs.csv','utf8', function (err, data) {
        if (err) {
            throw err;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ content: HEADER + data}));
    });

});


/*
 *  '/subnet/:id' will return the status of all nodes of a subnet
 *  for preparation of evaluations-data
 */
router.get('/subnet/:id', function(req, res, next) {

    const HEADER = "mrid;category\n";
    const fs = require('fs');
    if (req.params.id === 'abcde') {
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
            if ((simulatedGridFailures.includes(req.params.id) || simulatedGatewayFailures.includes(req.params.id))) {
                for (const gateway of subnetTopology.smgw) {
                    // We check if a failure should be simulated
                    if ((simulatedGatewayFailures.includes(gateway.id) || simulatedGridFailures.includes(req.params.id)) ) {
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

});

/*
 *  '/meter/:id' will return the status of all nodes of a subnet, aggregated for the last 12 hours
 *
 */
router.get('/subnet/:id/past', function(req, res, next) {

    const HEADER = "mrid;category\n";

    if (req.params.id === 'fff76033-6ed2-4296-90c0-ed682a68b6ec') {
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

});

/*
 *  /meter/:id/days returns Smartmeter values vor the last day
 *
 */
router.get('/meter/:id/day/', function(req, res, next) {

    const HEADER = "mrid;timestamp;value\n";

    if (req.params.id === 'c41daf96-f387-4098-bd23-fce1f32bf9d4') {
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

});

/*
 *  FIXME: Aggregation über IDs, nicht Zeitreihen möglich?
 *
 * /plausibility/subnet/:id returns all plausibilities within a given subnet per algorithm
 *
 */
router.get('/plausibility/subnet/:id', function(req, res, next) {

    const HEADER = "mrid;plausibility_value;plausibility_source\n";

    //FIXME: check for subnets (at least check if correct subnet was supplied)
    const fs = require('fs');
    if (req.params.id === 'fff76033-6ed2-4296-90c0-ed682a68b6ec') {
        fs.readFile(__dirname + '/../public/CSV/07_plausi_subnet-status_nearest.csv', 'utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({content: HEADER + data}));
        });
    } else if (req.params.id === 'ffd09fda-6552-410b-bf64-cc25e0981e54') {
        fs.readFile(__dirname + '/../public/CSV/simulation/07_plausi_subnet-status_nearest_e54.csv', 'utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({content: HEADER + data}));
        });
    } else if (req.params.id === 'a0dee2d8-a55f-4e32-a169-0e768f815bc3') {
        fs.readFile(__dirname + '/../public/CSV/simulation/07_plausi_subnet-status_nearest_bc3.csv', 'utf8', function (err, data) {
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
                    if (smartMeter.type === "producer") {
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

});


/*
 *  /plausibility/meter/:id/past returns plausibility for each algorithm for one SMGW in the given timespan which should be 24h
 *
 */
router.get('/plausibility/meter/:id/past', function(req, res, next) {

    const HEADER = "mrid;timestamp;plausibility_value;plausibility_source\n";
    const fs = require('fs');

    if (req.params.id === 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
        fs.readFile( __dirname + '/../public/CSV/08_plausi_sm_24hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        fs.readFile( __dirname + '/../public/CSV/simulation/08_plausi_sm_24hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            data = data.replace(new RegExp('MRID', 'g'), req.params.id);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    }

});


/*
 *  Plausbilität je Algo eines SMGWs NOW
 *
 *
 *
 */
router.get('/plausibility/meter/:id', function(req, res, next) {

    const HEADER = "mrid;plausibility_value;plausibility_source\n";
    const fs = require('fs');
    if (req.params.id === 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
        fs.readFile( __dirname + '/../public/CSV/06_plausi_sm-status_nearest_SMe91a.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        fs.readFile( __dirname + '/../public/CSV/simulation/06_plausi_sm-status_nearest.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            data = data.replace('MRID', req.params.id);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    }

});


/*
 *  /meter/:id/from/:from/to/:to returns Smartmeter values between from and to with a 1 hour resolution
 *
 *  TODO: Eventuelle Rückberechnung eines now ts - 1M statt "from"
 *  value eines SMGWs 1 Monat bei 1 M zwischen from/to
 *  values eines SMGWs 2 Monate for 13 Monaten zwischebn from/to
 */
router.get('/meter/:id/lastmonth/', function(req, res, next) {

    const HEADER = "mrid;timestamp;value\n";
    const fs = require('fs');
    if (req.params.id === 'd6474feb-d37a-405c-b16b-5e39138355d0') {
        fs.readFile( __dirname + '/../public/CSV/09_last_month_hourly.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else if (req.params.id === 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
        fs.readFile( __dirname + '/../public/CSV/09_last_month_hourly_SMe91a.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        fs.readFile( __dirname + '/../public/CSV/simulation/09_last_month_hourly.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            data = data.replace('MRID', req.params.id);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    }

});

/*
 *  /meter/:id/pastmonth returns Smartmeter values between 13 and 11 month ago (2 month) with a 1 hour resolution
 *
 *  values eines SMGWs 2 Monate for 13 Monaten zwischebn from/to
 */
router.get('/meter/:id/pastmonth', function(req, res, next) {

    const HEADER = "mrid;timestamp;value\n";

    if (req.params.id === 'd6474feb-d37a-405c-b16b-5e39138355d0') {
        var fs = require('fs');
        fs.readFile( __dirname + '/../public/CSV/10_last_two_month_hourly.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else if (req.params.id === 'd71bb352-0cdb-4e74-9754-11687a7de91a') {
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

});


/*
 *  /weather/:location/ returns the weather of past 24 hours 30 Minute resolution
 *
 * wetter eines SMGWs 24h
 */
router.get('/weather/:location', function(req, res, next) {

    const HEADER = "location;twothousandeighteen;category;type;timestamp;id;unit_multiplier;unit;value\n";

    if (req.params.location.toLowerCase() === 'oldenburg') {
        var fs = require('fs');
        fs.readFile( __dirname + '/../public/CSV/11_weather_by_location_24hrs.csv','utf8', function (err, data) {
            if (err) {
                throw err;
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ content: HEADER + data}));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: {code: 404, message: 'Location: ' + req.params.location.toLowerCase() + ' was not found'}}));
    }

});


module.exports = router;
