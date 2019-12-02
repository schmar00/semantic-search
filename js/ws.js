// webservices
"use strict";
var ws_micka = {
    endpoint: 'https://resource.geolba.ac.at/PoolParty/sparql/geoera_keyword',

    json: function (query, thenFunc) {
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=application/json')
            .then(res => res.json())
            .then(thenFunc);
    }
};

var ws_keywords = {
    endpoint: ' https://resource.geolba.ac.at/PoolParty/sparql/geoera_keyword',

    json: function (query, thenFunc) {
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=application/json')
            .then(res => res.json())
            .then(thenFunc);
    }
};