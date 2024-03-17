/* 
 * Magic Mirror
 * Module: MMM-EnphaseSolar
 * By Matt Thurling
 *
 * MIT Licensed.
 */

var https = require('https');
var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting node helper: " + this.name);
    },

    socketNotificationReceived: function(notification, payload) {
        var self = this;

        if(notification === "GET_ENPHASE_SOLAR") {
            new Promise(resolve => {
                if (payload.sessionId) {
                    if (payload.config.debug) {
                        console.debug("MMM-EnphaseSolar: already have a session token");
                    }
                    return resolve(payload.sessionId);
                }
                console.info("MMM-EnphaseSolar: Getting a session token");
                const tokenOptions = {
                    host: payload.config.gatewayHost,
                    method: 'GET',
                    path: '/auth/check_jwt',
                    rejectUnauthorized: false,
                    headers: {
                        Host: payload.config.gatewayHost,
                        Authorization: ' Bearer ' + payload.config.token,
                    }
                };
                const tokenReq = https.request(tokenOptions, (response) => {
                    var sessionId;
                    if (response.statusCode == 200) {
                        const setCookie = response.headers['set-cookie'][0];
                        sessionId = Object.fromEntries(setCookie.split('; ').map(v => v.split(/=(.+)/))).sessionId;
                        if (sessionId) {
                            payload.sessionId = sessionId;
                        } else {
                            console.error("MMM-EnphaseSolar: Failed to get session id! Set-Cookie was: " + setCookie);
                        }
                    } else {
                        console.error("MMM-EnphaseSolar: Failed to authorize with local gateway! Response code: " + response.statusCode);
                    }
                    response.on('data', function() {
                    });
                    response.on('end', function() {
                        resolve(sessionId);
                    });
                });
                tokenReq.on('error', (error) => {
                    console.error("MMM-EnphaseSolar: Failed to authorize with local gateway! error: " + error);
                });
                tokenReq.end();
            }).then(sessionId => {

                const getProdData = self.getEnvoyPromise(payload.config.gatewayHost, '/production.json', payload.sessionId, 'production');
                const getInvData = self.getEnvoyPromise(payload.config.gatewayHost, '/ivp/ensemble/inventory', payload.sessionId, 'inventory');
                const getLiveData = self.getEnvoyPromise(payload.config.gatewayHost, '/ivp/livedata/status', payload.sessionId, 'live');
                
                Promise.all([getProdData, getInvData, getLiveData]).then(returnedData => {
                    var processedData = {};
                    for (const data of returnedData) {
                        if (data.production) {
                            if (data.production.error) {
                                // clear the session id as it's expiry is likely the cause of the error
                                sessionId = null;
                            }
                            for (const productionData of data.production.production) {
                                if (productionData.type === "eim") {
                                    processedData.todaysProduction = (productionData.whToday / 1000).toFixed(2);
                                    processedData.lastUpdated = productionData.readingTime;
                                }
                            }
                            for (const consumptionData of data.production.consumption) {
                                if (consumptionData.measurementType === "total-consumption") {
                                    processedData.todaysUsage = (consumptionData.whToday / 1000).toFixed(2);
                                }
                            }
                        }
                        else if (data.inventory) {
                            if (data.inventory.error) {
                                // clear the session id as it's expiry is likely the cause of the error
                                sessionId = null;
                            }
                            for (const inventoryData of data.inventory) {
                                if (inventoryData.type === "ENCHARGE") {
                                    processedData.currentBatteryStatus = [];
                                    for (const device of inventoryData.devices) {
                                        processedData.currentBatteryStatus.push(device);
                                    }
                                }
                            }
                        }
                        else if (data.live) {
                            if (data.live.error) {
                                // clear the session id as it's expiry is likely the cause of the error
                                sessionId = null;
                            }
                            // the live data api returns results in milliwatts, hence dividing by 1000000
                            processedData.currentBatteryUsage = (data.live.meters.storage.agg_p_mw / 1000000).toFixed(2);
                            // current production can be slightly negative when nothing is being produced so zero it in that case
                            processedData.currentProduction = data.live.meters.pv.agg_p_mw < 0 ? 0 : (data.live.meters.pv.agg_p_mw / 1000000).toFixed(2);
                            processedData.currentUsage = (data.live.meters.load.agg_p_mw / 1000000).toFixed(2);
                            processedData.gridUsage = (data.live.meters.grid.agg_p_mw / 1000000).toFixed(2);
                        }
                    }
                    processedData.sessionId = sessionId;
                    //console.log(processedData);
                    self.sendSocketNotification("ENPHASE_SOLAR_DATA", processedData);
                })
            });
        }
    },

    getEnvoyPromise: function(gatewayHost, apiPath, sessionId, resultName) {
        return new Promise(resolve => {
            const options = {
                host: gatewayHost,
                method: 'GET',
                path: apiPath,
                rejectUnauthorized: false,
                headers: {
                    'Accept': 'application/json',
                    'Cookie': 'sessionId=' + sessionId,
                }
            };
            const dataReq = https.request(options, (response) => {
                var returnObject = {};
                if (response.statusCode != 200) {
                    console.error("MMM-EnphaseSolar: data request error: " + response.statusCode);
                    // clear session id since its expiry may have been the cause of the failure, will retrieve a new one on next refresh
                    returnObject[resultName] = {error: true};
                    resolve(returnObject);
                }
                response.on('data', (data) => {
                    try {
                        returnObject[resultName] = JSON.parse(data);
                        resolve(returnObject);
                    } catch(e) {
                        console.error("MMM-EnphaseSolar: Unable to parse JSON, data in response was: " + data);
                        returnObject[resultName] = {error: true};
                        resolve(returnObject);
                    }
                });
            });
            dataReq.on('error', (error) => {
                console.error("MMM-EnphaseSolar: Failed to retrieve solar data! error: " + error);
                var returnObject = {};
                returnObject[resultName] = {error: true};
                resolve(returnObject);
            });
            dataReq.end();
        });
    },
});
