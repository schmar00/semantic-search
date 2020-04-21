// webservices
"use strict";
let ws = {
    json2: function (query, thenFunc) {
        let a = [];
        if ($("input:checked", $('#selEndpoint')).val() == 'gba') {
            a = ['https://resource.geolba.ac.at/PoolParty/sparql/keyword', '&format=application/json'];
        } else {
            a = ['https://data.geoscience.earth/ncl/system/query', '&format=json'];
        }
        return fetch(a[0] + '?query=' + encodeURIComponent(query) + a[1])
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
