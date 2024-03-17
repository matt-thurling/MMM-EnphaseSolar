/* 
 * Magic Mirror
 * Module: MMM-EnphaseSolar
 * By Matt Thurling
 *
 * MIT Licensed.
 */

Module.register("MMM-EnphaseSolar",{

    defaults: {
        gatewayHost: "",
        token: "",
        refreshInterval: 1000 * 60 * 1, // 1 minute
        displayCurrentProduction: true,
        displayCurrentUsage: true,
        displayNetOutput: true,
        displayTodaysProduction: true,
        displayTodaysUsage: true,
        displayLastUpdate: true,
        displayLastUpdateFormat: "ddd HH:mm:ss",
        displayBatteries: true,
        debug: false,
    },

    start: function() {
        Log.info("Starting module: " + this.name);

        this.currentProduction = {
            title: this.translate('CURRENT_PRODUCTION') + ":",
            suffix: this.translate('SUFFIX_KILOWATT'),
            value: this.translate('LOADING')
        };
        this.currentUsage = {
            title: this.translate('CURRENT_USAGE') + ":",
            suffix: this.translate('SUFFIX_KILOWATT'),
            value: this.translate('LOADING')
        };
        this.gridUsage = {
            importingTitle: this.translate('IMPORTING') + ":",
            exportingTitle: this.translate('EXPORTING') + ":",
            suffix: this.translate('SUFFIX_KILOWATT'),
            value: this.translate('LOADING')
        };
        this.todaysProduction = {
            title: this.translate('PRODUCED_TODAY') + ":",
            suffix: this.translate('SUFFIX_KILOWATTHOUR'),
            value: this.translate('LOADING')
        };
        this.todaysUsage = {
            title: this.translate('USED_TODAY') + ":",
            suffix: this.translate('SUFFIX_KILOWATTHOUR'),
            value: this.translate('LOADING')
        };
        this.currentBatteryStatus = {
            title: this.translate('BATTERY_CHARGE'),
            suffix: this.translate('SUFFIX_PERCENT'),
            value: this.translate('LOADING')
        };
        this.currentBatteryUsage = {
            idleTitle: this.translate('BATTERY_USAGE_IDLE') + ": ",
            chargingTitle: this.translate('BATTERY_USAGE_CHARGING') + ": ",
            dischargingTitle: this.translate('BATTERY_USAGE_DISCHARGING') + ": ",
            suffix: this.translate('SUFFIX_KILOWATT'),
            value: this.translate('LOADING')
        };
        this.lastUpdated = Date.now() / 1000;

        this.loaded = false;
        this.getEnphaseSolarData();

        var self = this;

        setInterval(function() {
            self.getEnphaseSolarData();
            self.updateDom();
        }, this.config.refreshInterval);
    },

    //Import additional CSS Styles
    getStyles: function() {
        return ['MMM-EnphaseSolar.css']
    },

    getEnphaseSolarData: function() {
        Log.info("MMM-EnphaseSolar: getting data");

        this.sendSocketNotification("GET_ENPHASE_SOLAR", {
            config: this.config,
            sessionId: this.sessionId
        });
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "ENPHASE_SOLAR_DATA" && payload.sessionId) {
            this.sessionId = payload.sessionId;
            this.currentProduction.value = payload.currentProduction;
            this.todaysProduction.value = payload.todaysProduction;
            this.lastUpdated = payload.lastUpdated;
            this.currentUsage.value = payload.currentUsage;
            this.todaysUsage.value = payload.todaysUsage;
            this.gridUsage.value = payload.gridUsage;
            this.currentBatteryStatus.value = payload.currentBatteryStatus;
            this.currentBatteryUsage.value = payload.currentBatteryUsage;

            this.loaded = true;
            this.updateDom();
        } else {
            // if the payload came back with an empty session id then data retrieval failed, don't try and process it
            this.sessionId = null;
        }
    },

    getDom: function() {
        var wrapper = document.createElement("div");

        if (!this.config.gatewayHost || !this.config.token) {
            wrapper.innerHTML = this.translate('ERROR_MISSING_CONFIG');
            return wrapper;
        }

        //Display loading while waiting for API response
        if (!this.loaded) {
            wrapper.innerHTML = this.translate('LOADING');
            return wrapper;
        }

        var tableElement = document.createElement("table");

        if (this.config.displayCurrentProduction) {
            tableElement.appendChild(this.addRow(this.currentProduction.title, this.currentProduction.value, this.currentProduction.suffix, 'current-production'));
        }

        if (this.config.displayCurrentUsage) {
            tableElement.appendChild(this.addRow(this.currentUsage.title, this.currentUsage.value, this.currentUsage.suffix, 'current-usage'));
        }

        if (this.config.displayNetOutput) {
            var gridUsageTitle;
            var gridUsageClass;
            if (this.gridUsage.value > 0) {
                gridUsageTitle = this.gridUsage.importingTitle;
                gridUsageClass = 'net-output-importing';
            } else {
                gridUsageTitle = this.gridUsage.exportingTitle;
                gridUsageClass = 'net-output-exporting';
            }
            tableElement.appendChild(this.addRow(gridUsageTitle, Math.abs(this.gridUsage.value), this.gridUsage.suffix, gridUsageClass));
        }

        if (this.config.displayTodaysProduction) {
            tableElement.appendChild(this.addRow(this.todaysProduction.title, this.todaysProduction.value, this.todaysProduction.suffix, 'todays-production'));
        }

        if (this.config.displayTodaysUsage) {
            tableElement.appendChild(this.addRow(this.todaysUsage.title, this.todaysUsage.value, this.todaysUsage.suffix, 'todays-usage'));
        }

        if (this.config.displayBatteries) {
            var batteryCount = 1;
            for (const battery of this.currentBatteryStatus.value) {
                tableElement.appendChild(this.addRow(this.currentBatteryStatus.title + ' ' + batteryCount + ':', this.currentBatteryStatus.value[batteryCount-1].percentFull, this.currentBatteryStatus.suffix));
                batteryCount++;
            }

            var usageTitle;
            var batteryStateClass;
            if (this.currentBatteryUsage.value == 0) {
                usageTitle = this.currentBatteryUsage.idleTitle;
                batteryStateClass = 'battery-state-idle';
            } else if (this.currentBatteryUsage.value > 0) {
                usageTitle = this.currentBatteryUsage.dischargingTitle;
                batteryStateClass = 'battery-state-discharging';
            } else if (this.currentBatteryUsage.value < 0) {
                usageTitle = this.currentBatteryUsage.chargingTitle;
                batteryStateClass = 'battery-state-charging';
            }
            tableElement.appendChild(this.addRow(usageTitle, Math.abs(this.currentBatteryUsage.value), this.currentBatteryUsage.suffix, batteryStateClass));
        }

        wrapper.appendChild(tableElement);

        if (this.config.displayLastUpdate) {
            var updateinfo = document.createElement("div");
            updateinfo.className = "xsmall light";
            updateinfo.innerHTML = this.translate('LAST_UPDATED') + ": " + moment.unix(this.lastUpdated).format(this.config.displayLastUpdateFormat);
            wrapper.appendChild(updateinfo);
        }

        return wrapper;
    },

    addRow: function(title, value, suffix, className) {
        var rowElement = document.createElement("tr");

        var titleElement = document.createElement("td");
        titleElement.innerHTML = title;
        titleElement.className = "title-" + className + " medium regular bright";
        rowElement.appendChild(titleElement);

        var dataElement = document.createElement("td");
        dataElement.innerHTML = value + " " + suffix;
        dataElement.className = "data-" + className + " medium light normal";
        rowElement.appendChild(dataElement);

        return rowElement;
    },

    getTranslations() {
        return {
            en: 'translations/en.json',
        };
    },
});
