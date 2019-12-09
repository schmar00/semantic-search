"use strict";

var micka = {

    init: function () {
        micka.USER_LANG = (navigator.language || navigator.language).substring(0, 2);
        let suppLang = ['en', 'cs', 'da', 'el', 'de', 'es', 'et', 'fi', 'fr', 'hr', 'hu', 'is', 'it', 'lt', 'nl', 'no', 'pl', 'pt', 'ro', 'sk', 'sl', 'sv', 'uk'];
        if (!suppLang.includes(micka.USER_LANG)) {
            micka.USER_LANG = 'en';
        }

        let urlParams = new URLSearchParams(window.location.search);

        if (urlParams.has('lang')) {
            micka.USER_LANG = urlParams.get('lang');
        }

        micka.insertSearchCard('search_widget'); //inserts search widget only                

        if (urlParams.has('search')) {
            micka.search(decodeURI(urlParams.get('search')));

        }
        micka.initSearch(); //provides js for fuse search 
        document.getElementById('lang').innerHTML = '[' + micka.USER_LANG + ']';
    },

    insertSearchCard: function (widgetID) {
        $('#searchInput').keydown(function (e) {
            switch (e.which) {
                case 13:
                    if (Object.keys(micka.__upperConcept).length !== 0) {
                        micka.semanticSearch(micka.__upperConcept.uri, micka.__upperConcept.label);
                        $('#dropdown').empty();
                        micka.__upperConcept = {};
                    } else {
                        micka.fullTextSearch($('#searchInput').val());
                    }
                    break;
                case 38: // up
                    micka.__selectSearchLink(1);
                    break;
                case 40: // down
                    micka.__selectSearchLink(0);
                    break;
            };
        });

        $('#searchBtn').click(function (e) {
            micka.fullTextSearch($('#searchInput').val());
        });

        $('#searchInput').focusout(function () {
            $('#dropdown').delay(300).hide(0, function () {
                $('#dropdown').empty();
                //$('#searchInput').val('');
            });
        });

        let timer;
        $('#searchInput').on('input', function () {
            clearTimeout(timer);
            $('#dropdown').empty();
            timer = setTimeout(function () {
                if ($('#searchInput').val().length > 0) {
                    $('#dropdown').show();
                    let autoSuggest = window.fuse.search($('#searchInput').val());
                    micka.__upperConcept = {
                        label: autoSuggest.slice(0, 1)[0].L.value,
                        uri: autoSuggest.slice(0, 1)[0].URIs.value
                    };
                    $.each(autoSuggest.slice(0, 10), function (index, value) {
                        $('#dropdown').append(` <tr>
                                                <td class="searchLink dropdown-item" 
                                                    onclick="micka.semanticSearch('${value.URIs.value}','${value.L.value}');" data-uri="${value.URIs.value}", data-label="${value.L.value}">
                                                    ${value.L.value}
                                                </td>
                                            </tr>`);
                    });
                }
            }, 200);
        });
    },

    //**********************the initial sparql query to build the fuse (trie) object - stored in window****         
    initSearch: function () {
        ws_micka.json(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#> 
                                    SELECT (GROUP_CONCAT(?s; separator = ';') as ?URIs) ?L 
                                    WHERE { 
                                    VALUES ?p {skos:prefLabel skos:altLabel} 
                                    ?s a skos:Concept; ?p ?L . FILTER(lang(?L)="${micka.USER_LANG}")
                                    }
                                    GROUP BY ?L`, jsonData => {
            const options = {
                shouldSort: true,
                tokenize: true,
                keys: ['L.value']
            };
            window.fuse = new Fuse(jsonData.results.bindings, options);
            //console.log(window.fuse);
            document.getElementById('searchInput').disabled = false;
        });
    },

    //************************perform the search for a selected term ************************************         
    semanticSearch: function (URIs, origLabel) {
        $('#searchInput').val(origLabel);
        // ohne select (group_concat(distinct ?c; separator = '|') as ?category)
        ws_micka.json(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                        PREFIX dbp:<http://dbpedia.org/ontology/>
                        select distinct (min(?r) as ?rank) ?L
                        where {
                        values ?s {<${URIs.replace(/;/g, "> <")}>}
                        values ?l {skos:altLabel skos:prefLabel skos:hiddenLabel}
                        {?s ?l ?L filter(lang(?L)='en') bind(0 as ?r)}
                        union
                        {?s skos:related ?o . ?o ?l ?L filter(lang(?L)='en') bind(1 as ?r)}
                        union
                        {?s skos:narrower ?o . ?o ?l ?L filter(lang(?L)='en') bind(2 as ?r)}
                        union
                        {?s skos:narrower+ ?o . ?o ?l ?L filter(lang(?L)='en') bind(3 as ?r)}
                        union
                        {?s skos:broader ?o . ?o ?l ?L filter(lang(?L)='en') bind(4 as ?r)}
                        }
                        group by ?L
                        order by ?rank
                        LIMIT 40`, data => {
            //let allTerms = data.results.bindings.map(a => a.L.value.toLowerCase());
            let rankedTerms = [];
            console.log(data.results.bindings);
            for (let i = 0; i <= 5; i++) {
                rankedTerms.push($.map(data.results.bindings.filter(item => item.rank.value == i), (a => (a.L.value.replace(' (theme)', '').toLowerCase()))));
            }
            console.log(rankedTerms);
            micka.clearPage();
            micka.queryCSW(rankedTerms); //alle Begriffe und in 5 arrays zerteilt
        });
    },

    //******************************************************************************************************
    clearPage: function () {
        let content = document.getElementById('pageContent').childNodes;
        for (let a of content) {
            a.innerHTML = '';
        }
    },

    //******************************************************************************************************
    fullTextSearch: function (searchTerm) {

        let prefix = 'https://egdi.geology.cz/csw/?request=GetRecords&query=(';
        let suffix = ')&format=application/json&language=eng&MaxRecords=100&ElementSetName=full';
        let results = [];
        let rankedTerms = [[], [], [], [], []];
        rankedTerms[0].push(searchTerm.toLowerCase());
        micka.clearPage();

        fetch(`${prefix}Anytext like '* ${searchTerm}*'${suffix}`)
            .then(res => res.json())
            .then(data => {
                results = micka.addResults(results, data, rankedTerms);
                micka.printResults(results.sort((a, b) => b.rank - a.rank), [[`${searchTerm}`], [], [], []]);
            });
    },

    //******************************************************************************************************

    createQ1: function (terms, queryType) { //micka query doesn`t accept brackets? -> replace
        return terms.map(a => encodeURIComponent(queryType + '\'' + a + '\'').replace('\(', '').replace('\)', '')).join('+OR+');
    },

    createQ2: function (terms, queryType) { //micka query doesn`t accept brackets? -> replace
        return terms.map(a => encodeURIComponent(queryType + '\'*' + a + '*\'').replace('\(', '').replace('\)', '')).join('+OR+');
    },

    queryCSW: function (rankedTerms) {
        let fetchQ = []; //Array (der inneren Teile) der CSW Abfragen
        let aQ = rankedTerms[0];
        let bQ = rankedTerms[1].concat(rankedTerms[2]);
        let cQ = rankedTerms[3].concat(rankedTerms[4]);

        fetchQ.push(micka.createQ2(aQ, 'subject like ') + '+OR+' + micka.createQ2(aQ, 'title like '));

        if (bQ.length > 0) {
            fetchQ.push(micka.createQ2(bQ, 'subject like ') + '+OR+' + micka.createQ2(bQ, 'title like '));
        }

        fetchQ.push(micka.createQ2(aQ, 'abstract like '));

        if (bQ.length > 0) {
            fetchQ.push(micka.createQ2(bQ, 'abstract like '));
        }

        if (cQ.length > 0) {
            fetchQ.push(micka.createQ2(cQ, 'subject like ') + '+OR+' + micka.createQ2(cQ, 'title like ') + '+OR+' + micka.createQ2(cQ, 'abstract like '));
        }

        /*
        1) *keyword* => subject, title
        2) *narrower*, *related* => subject, title
        3) *keyword* => abstract
        4) *narrower*, *related* => abstract
        5) *broader*, *narrower+* => subject, title
        6) *broader*, *narrower+* => abstract
        */

        let prefix = 'https://egdi.geology.cz/csw/?request=GetRecords&query=(';
        let suffix = ')&format=application/json&language=eng&ElementSetName=full';
        let results = []; //alle Ergebnisse (doppelte Einträge) mit id, title, abstract, keywords, rank, relevance,

        (async function loop() {
            for (let i = 0; i < fetchQ.length; i++) { //to run all 5 queries
                if (results.length > 100) { //to get a maximum of x results
                    break;
                }
                await fetch(prefix + fetchQ[i] + suffix)
                    .then(res => res.json())
                    .then(data => {
                        results = micka.addResults(results, data, rankedTerms);
                    });
                console.log(i, results);
            }
            micka.printResults(results.sort((a, b) => b.rank - a.rank), rankedTerms); //doppelte Einträge entfernen => funktioniert nicht!!
        })();
    },

    //******************************************************************************************************
    addResults: function (results, jsonData, rankedTerms) { //rank, relevance ausrechnen
        //console.log(jsonData.records);
        let resIDs = results.map(a => a.id);
        for (let a of jsonData.records) {
            if (!resIDs.includes(a.id)) {
                let k = [];
                if (a.keywords !== undefined) {
                    a.keywords.forEach(x => {
                        if (x.keywords !== undefined) {
                            k = k.concat(x.keywords.filter(Boolean))
                        }
                    });
                    k = k.map(a => a.replace(/[(),\/>]/g, '$').split('$')).flat().map(b => b.trim().toLowerCase());
                }

                let rank = 1;
                let keywords = [];
                for (let b of k) {
                    if (rankedTerms[0].includes(b.toLowerCase())) {
                        keywords.push('<span class="keywords1">' + b + '</span>');
                        rank += 10;
                    } else if (rankedTerms[1].includes(b.toLowerCase())) {
                        keywords.push('<span class="keywords2">' + b + '</span>');
                        rank += 3;
                    } else if (rankedTerms[2].concat(rankedTerms[3]).includes(b.toLowerCase())) {
                        keywords.push('<span class="keywords3">' + b + '</span>');
                        rank += 3;
                    } else if (rankedTerms[4].includes(b.toLowerCase())) {
                        keywords.push('<span class="keywords4">' + b + '</span>');
                        rank += 1;
                    } else {
                        keywords.push('<span class="keywords">' + b + '</span>');
                    }
                }
                console.log(k);
                let titleArr = a.title.replace(/[_/,]/g, ' ').split(' ').map(a => a.toLowerCase());
                let abstractArr = a.abstract.replace(/[_/,]/g, ' ').split(' ').map(a => a.toLowerCase());

                if (titleArr.some(r => rankedTerms[0].includes(r))) {
                    rank += 10;
                }
                if (abstractArr.some(r => rankedTerms[0].includes(r))) {
                    rank += 3;
                }
                if (titleArr.some(r => rankedTerms[1].concat(rankedTerms[2]).concat(rankedTerms[3]).concat(rankedTerms[4]).includes(r))) {
                    rank += 1;
                }
                if (abstractArr.some(r => rankedTerms[1].concat(rankedTerms[2]).concat(rankedTerms[3]).concat(rankedTerms[4]).includes(r))) {
                    rank += 1;
                }

                results.push({
                    id: a.id,
                    title: a.title,
                    abstract: a.abstract.substring(0, 500) + ' ..',
                    keywords: keywords,
                    rank: rank,
                    relevance: ((rank / 12 * 100).toFixed(0) > 100) ? 100 : (rank / 12 * 100).toFixed(0)
                });
            }
        }
        return results
    },

    //******************************************************************************************************
    printResults: function (results, rankedTerms) { //HTML erstellen

        if (results.length == 19) {
            document.getElementById('1').innerHTML += 'more than ';
        }
        document.getElementById('1').innerHTML += `<strong>
                                                    ${results.length}
                                                </strong> results for: <span class="keywords1">
                                                    ${rankedTerms[0].join('</span> <span class="keywords1">')}
                                                </span><br>`;
        if (rankedTerms[1].length > 0) {
            document.getElementById('1').innerHTML += `- related terms: <span class="keywords2">
                                                        ${rankedTerms[1].join('</span> <span class="keywords2">')}
                                                    </span> <br>`;
        }
        if (rankedTerms[2].concat(rankedTerms[3]).length > 0) {
            document.getElementById('1').innerHTML += `- narrower terms: <span class="keywords3">
                                                        ${rankedTerms[2].concat(rankedTerms[3]).join('</span> <span class="keywords3">')}
                                                    </span> <br>`;
        }
        if (rankedTerms[4].length > 0) {
            document.getElementById('1').innerHTML += `- and broader terms: <span class="keywords4">
                                                        ${rankedTerms[4].join('</span> <span class="keywords4">')}
                                                    </span>
                                                    <br>`;
        }
        document.getElementById('1').innerHTML += `in keywords, title and abstracts texts<hr>`;

        let mickaViewer = 'https://egdi.geology.cz/record/basic/'; // basic für NEUEN Micka hinzufügen
        for (let record of results) {
            document.getElementById('1').innerHTML += `
                        <div>
                            <a href="${mickaViewer + record.id}">
                                <strong>
                                    ${record.title}
                                </strong>
                            </a>
                            <span style="float:right">
                                relevance: ${record.rank} pts or <strong>${record.relevance}%
                            </span>
                        </div>
                        <br>
                        <p style="line-height: 80%;">
                            <small>
                                ${record.abstract}
                            </small>
                        </p>
                        <p  style="line-height: 80%;">
                            ${record.keywords.join(' ')}
                        </p>
                        <hr>`;
        }
    },

    __upperConcept: {},
    __selectSearchLink: function (up, click) {
        var options = $(".searchLink");
        if (options.length == 0)
            return;
        for (var c = 0; c < options.length; c++) {
            if ($(options[c]).hasClass("selected"))
                break;
        }
        if (click) {
            return c >= options.length ? null : $(options[c]);
        }
        if (c >= options.length)
            c = -1;
        if (up)
            c = c < 1 ? options.length - 1 : c - 1;
        else
            c = c == -1 || c == options.length - 1 ? 0 : c + 1;
        options.removeClass("active");
        options.removeClass("selected");
        if (c >= 0) {
            var o = $(options[c]);
            o.addClass("selected");
            o.addClass("active");
            var searchInput = $('#searchInput');
            searchInput.val(o.text().trim());
            micka.__upperConcept = {
                label: o.attr("data-label"),
                uri: o.attr("data-uri")
            };
        }
    }
};

/* MICKA query examples

https://egdi.geology.cz/csw/?request=GetRecords
&query=(subject='Geology'+OR+Subject='Hydrogeology')
&format=application/json
&MaxRecords=50
&StartPosition=
&language=eng
&ElementSetName=full

https://egdi.geology.cz/csw/?request=GetRecords
&query=(subject='Geology'+AND+Subject='Hydrogeology')
&format=application/json
&MaxRecords=50
&StartPosition=
&language=eng
&ElementSetName=full

https://egdi.geology.cz/csw/?request=GetRecords
&query=(title like '*Hydrogeology*' OR abstract like '*Hydrogeology*')
&format=application/json
&MaxRecords=9999
&StartPosition=
&language=eng
&elementsetname=full

Also fulltext search in any metadata element is provided by AnyText element:

https://egdi.geology.cz/csw/?request=GetRecords
&query=Anytext like '*radon*'
&format=application/json
&MaxRecords=9999
&StartPosition=
&language=eng
&elementsetname=full
*/

//***********************************************************************************************************      
//********************************END************************************************************************
