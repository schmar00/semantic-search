// webservices
"use strict";
var ws_brgm = {
    endpoint: 'https://data.geoscience.earth/ncl/system/query',

    json2: function (query, thenFunc) {
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=json')
            .then(res => res.json())
            .then(thenFunc);
    }
};




var ws_gba = {
    endpoint: 'https://resource.geolba.ac.at/PoolParty/sparql/keyword',

    json2: function (query, thenFunc) {
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=application/json')
            .then(res => res.json())
            .then(thenFunc);
    }
};

/*var ws_keywords = {
    endpoint: ' https://resource.geolba.ac.at/PoolParty/sparql/geoera_keyword',

    json2: function (query, thenFunc) {
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=application/json')
            .then(res => res.json())
            .then(thenFunc);
    }
};*/


