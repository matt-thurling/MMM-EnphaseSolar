# MMM-EnphaseSolar
A Module for [MagicMirror](https://github.com/MichMich/MagicMirror) designed to retrieve data from an Enphase-S gateway (firmware 7+) - it may work with other Enphase gateways but this is all I have to test with. This module is reading data locally from your gateway (i.e. not via the enlighten cloud API) but you'll still need to get a login token for it from Enphase (see instructions below).

## Installation
  1. Clone this repo into your MagicMirror/modules directory
  2. Get a login token (see instructions below)
  3. Create an entry in 'config/config.js' with your gateway host (envoy.local will work for most depending on your local network setup), login token, and any of the other optional configs.

 **Example:**
 Commented out lines below are optional, the example given is their default value
````javascript
modules: [
  {
    module: 'MMM-EnphaseSolar',
    position: 'top_right',
    header: 'Enphase Solar',
    config: {
      gatewayHost: "envoy.local", // use ip address if the default doesn't work
      token: "a very long string obtained by following instructions below",
      // refreshInterval: 1000 * 60 * 1, // 1 minute
      // displayCurrentProduction: true,
      // displayCurrentUsage: true,
      // displayNetOutput: true,
      // displayTodaysProduction: true,
      // displayTodaysUsage: true,
      // displayLastUpdate: true,
      // displayLastUpdateFormat: "dd - HH:mm:ss", //format to display the last update. See Moment.js documentation for all display possibilities
    }
  }
]
````

## Login Token
Use of this module requires a login token. Apparently these tokens will expire after 12 months (though some have reported much less) so the following will need to be repeated when that happens. To obtain the token: 
  1. Visit https://entrez.enphaseenergy.com/
  2. Login with your enphase owner login details
  3. In the 'Select System' text box, type in the name of your "site". You can find this value if you login to the Enlighten mobile app, press the menu button, and it will be displayed at the top under your user's name. You only need to enter the first 3 characters and it should do a search and then you need to select your site from the results (typically only one site). Note: in my case there is a '/' as the 3rd character in my site name so typing 4 characters always failed for me due to the way this character is handled by their search so keep that in mind if you have a similar issue.
  4. In the gateway box select your gateway (most people would only have one option here)
  5. Click Create access token
  6. Copy the entire text from the Access token text box or click the "Copy and close" button, then paste this into your config.js as the value for `token`.

## Optional Configurations
| **Configuration** | **Description** | **Default** |
| --- | --- | --- |
| `refreshInterval` | How often to refresh the data. | `1000 * 60 * 1` i.e. 1 minute |
| `displayCurrentProduction` | Whether to display the current energy production, displayed in kW. | `true` |
| `displayCurrentUsage` | Whether to display the current energy usage, displayed in kW. | `true` |
| `displayNetOutput` | Whether to display the current net energy output, displayed in kW as importing (using more than producing) or exporting (producing more than being used). | `true` |
| `displayTodaysProduction` | Whether to display the total energy produced today, displayed in kWh. | `true` |
| `displayTodaysUsage` | Whether to display the total energy used today (does not differentiate between energy imported or from the grid), displayed in kWh. | `true` |
| `displayLastUpdate` | Whether to display the last updated timestamp, formatted as per `displayLastUpdateFormat` (see below). This value is the date/time the meter was read as reported from the local gateway, not the last time the module attempted to retrieve the data. | `true` |
| `displayLastUpdateFormat` | Format to display the last update value. See [Moment.js](https://momentjs.com/docs/#/displaying/) documentation for all display possibilities. | `ddd HH:mm:ss` |


## Screenshot
![alt text](https://github.com/matt-thurling/MMM-EnphaseSolar/blob/main/Screenshot-Exporting.png "Exporting Example")
![alt text](https://github.com/matt-thurling/MMM-EnphaseSolar/blob/main/Screenshot-Importing.png "Importing Example")

## Attribution

This project was initially inspired by the MMM-Solar module written by Thomas Krywitsky (https://github.com/tkrywit/MMM-Solar/).


The MIT License (MIT)
=====================

Copyright © 2023 Matt Thurling

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the “Software”), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

**The software is provided “as is”, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.**
