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
                    return resolve(payload.sessionId);
                }
                console.log("MMM-EnphaseSolar: Getting a session token")
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
                            console.log("Failed to get session id! Set-Cookie was: " + setCookie);
                        }
                    } else {
                        console.log("Failed to authorize with local gateway! Response code: " + response.statusCode);
                    }
                    response.on('data', function() {
                    });
                    response.on('end', function() {
                        resolve(sessionId);
                    });
                });
                tokenReq.on('error', (error) => {
                    console.log("Failed to authorize with local gateway! error: " + error);
                });
                tokenReq.end();
            }).then(sessionId => {
                const options = {
                    host: payload.config.gatewayHost,
                    method: 'GET',
                    path: '/production.json?details1',
                    rejectUnauthorized: false,
                    headers: {
                        'Accept': 'application/json',
                        'Cookie': 'sessionId=' + payload.sessionId,
                    }
                };
                const dataReq = https.request(options, (response) => {
                    if (response.statusCode != 200) {
                        console.log("data request error: " + response.statusCode);
                        // clear session id since its expiry may have been the cause of the failure, will retrieve a new one on next refresh
                        self.sendSocketNotification("ENPHASE_SOLAR_DATA", {sessionId: "", production: [], consumption: []});
                    }
                    response.on('data', (data) => {
                        var jsonData = JSON.parse(data);
                        jsonData.sessionId = sessionId;
                        self.sendSocketNotification("ENPHASE_SOLAR_DATA", jsonData);
                    });
                });
                dataReq.on('error', (error) => {
                    console.log("Failed to retrieve solar data! error: " + error);
                });
                dataReq.end();
            });
        }
    },
});
