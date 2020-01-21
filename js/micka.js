"use strict";

var micka = {

    init: function () {
        micka.USER_LANG = (navigator.language || navigator.language).substring(0, 2);
        let suppLang = ['en', 'cs', 'da', 'el', 'de', 'es', 'et', 'fi', 'fr', 'hr', 'hu', 'is', 'it', 'lt', 'nl', 'no', 'pl', 'pt', 'ro', 'sk', 'sl', 'sv', 'uk'];
        let cat = ['Applied Geophysics', 'Fossil Resources', 'Geochemistry', 'Geochronology-Stratigraphy', 'Geological Processes', 'Geothermal Energy', 'Hazard, Risk and Impact', 'Hydrogeology', 'Information System', 'Lithology', 'Mineral Resources', 'Modelling', 'Structural Geology', 'Subsurface Energy Storage', 'Subsurface Management'];

        cat.forEach(function (c, index) {
            $('#searchCategories').append(`<option value="${index}" selected="selected">${c}</option>`);
        });

        let selectedCategories = '';
        $('#searchCategories').multiselect({
            includeSelectAllOption: true,
            onDropdownHide: function (option, checked) {
                selectedCategories = $('#searchCategories option:selected').map((a, item) => item.label).toArray().join('\'@en \'');
                micka.initSearch(selectedCategories);
            },
        });

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
        micka.initSearch(selectedCategories); //provides js for fuse search
        document.getElementById('lang').innerHTML = '[' + micka.USER_LANG + ']';
    },

    startSearch: function (e) {
        let sT = $('#searchInput').val();
        //console.log(sT);
        if (sT.length !== 0) {
            if (Object.keys(micka.__upperConcept).length !== 0) {
                if (similarity(sT, micka.__upperConcept.label) > 0.7) {
                    let searchInfo = '';
                    if (sT !== micka.__upperConcept.label) {
                        searchInfo = `searched for <span class="keywords1">${micka.__upperConcept.label}</span>
                                                  <br>
                                                  search instead for <span class="keywords1" onclick="micka.fullTextSearch('${sT}');">${sT}</span>
                                                <hr>`;
                    }
                    micka.semanticSearch(micka.__upperConcept.uri, micka.__upperConcept.label, searchInfo);
                } else {
                    micka.fullTextSearch(sT);
                }
                $('#dropdown').empty();
                micka.__upperConcept = {};
            } else {
                micka.fullTextSearch(sT);
            }
        }
        document.getElementById('spinner').style.visibility = 'visible';
    },

    insertSearchCard: function (widgetID) {
        $('#searchInput').keydown(function (e) {
            switch (e.which) {
                case 13:
                    micka.startSearch();
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
            micka.startSearch();
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
                                                    onclick="micka.semanticSearch('${value.URIs.value}','${value.L.value}','');" data-uri="${value.URIs.value}", data-label="${value.L.value}">
                                                    ${value.L.value}
                                                </td>
                                            </tr>`);
                    });
                }
            }, 200);
        });
    },

    //**********************the initial sparql query to build the fuse (trie) object - stored in window****

    initSearch: function (selectedCategories) {

        let qCat = '';
        if (selectedCategories !== '') {
            qCat = `VALUES ?cat {'${selectedCategories}'@en}
                    ?s <http://dbpedia.org/ontology/category> ?cat`;
        }

        ws_micka.json2(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                        SELECT (GROUP_CONCAT(?s; separator = ';') as ?URIs) ?L
                        WHERE {
                        VALUES ?p {skos:prefLabel skos:altLabel}
                        ?s a skos:Concept; ?p ?L . FILTER(lang(?L)="${micka.USER_LANG}")
                        ${qCat}
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
    semanticSearch: function (URIs, origLabel, searchInfo) {
        //console.log($('#selectAll').prop('checked'));

        $('#searchInput').val(origLabel);
        // ohne select (group_concat(distinct ?c; separator = '|') as ?category)
        ws_micka.json2(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                        PREFIX dbp:<http://dbpedia.org/ontology/>
                        select distinct (min(?r) as ?rank) (lcase(str(?L)) as ?label)
                        where {
                        values ?s {<${URIs.replace(/;/g, "> <")}>}
                        values ?l {skos:altLabel skos:prefLabel skos:hiddenLabel}
                        {?s ?l ?L filter(lang(?L)='en' || lang(?L)='de' || lang(?L)='es' || lang(?L)='fr') bind(0 as ?r)}
                        union
                        {?s skos:related ?o . ?o ?l ?L filter(lang(?L)='en') bind(1 as ?r)}
                        union
                        {?s skos:narrower ?o . ?o ?l ?L filter(lang(?L)='en') bind(2 as ?r)}
                        union
                        {?s skos:narrower+ ?o . ?o ?l ?L filter(lang(?L)='en') bind(3 as ?r)}
                        union
                        {?s skos:broader ?o . ?o ?l ?L filter(lang(?L)='en') bind(4 as ?r)}
                        FILTER(!regex(str(?L), '/'))
                        FILTER(!regex(str(?L), ','))
                        FILTER(!regex(str(?L), ' and '))
                        FILTER(!regex(str(?L), ' or '))
                        }
                        group by ?L
                        order by ?rank
                        LIMIT 40`, data => {
            //let allTerms = data.results.bindings.map(a => a.L.value.toLowerCase());
            let rankedTerms = [];
            //console.log(data.results.bindings);
            for (let i = 0; i <= 5; i++) {
                rankedTerms.push($.map(data.results.bindings.filter(item => item.rank.value == i), (a => (a.label.value.toLowerCase()))));
            }
            //console.log(rankedTerms);
            micka.clearPage();
            $('#searchInfo').html(searchInfo);
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
        let suffix = `)&format=application/json&language=eng&MaxRecords=${parseInt($('#maxResults').val(), 10)+100}&ElementSetName=full`;
        let results = [];
        let rankedTerms = [[], [], [], [], []];
        rankedTerms[0] = searchTerm.toLowerCase().split(' ');
        micka.clearPage(); //(subject='Geology'+AND+Subject='Hydrogeology') FullText%3D%27GBA%27

        //console.log(`${prefix}FullText%3D'${searchTerm.replace(/ /g, "' AND FullText%3D'")}'${suffix}`);

        fetch(`${prefix}FullText%3D'${searchTerm.replace(/ /g, "' AND FullText%3D'")}'${suffix}`)
            .then(res => res.text())
            .then(text => {
                if (text.includes('<!DOCTYPE html>')) {
                    text = text.split('<!DOCTYPE html>')[0] + ']}';
                }
                results = micka.addResults(results, JSON.parse(text), rankedTerms);
                micka.printResults(results.sort((a, b) => b.rank - a.rank), [rankedTerms[0], [], [], [], []], 'full text (exact matches)');
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

        //Title like '*gba*' OR Abstract like '*gba*'
        //Title%20like%20%27*gba*%27%20OR%20Abstract%20like%20%27*gba*%27


        fetchQ.push(micka.createQ1(aQ, 'Subject=') + ' OR ' + micka.createQ2(aQ, 'Title like '));

        if (bQ.length > 0) {
            fetchQ.push(micka.createQ1(bQ, 'Subject=') + ' OR ' + micka.createQ2(bQ, 'Title like '));
        }

        fetchQ.push(micka.createQ2(aQ, 'Abstract like '));

        if (bQ.length > 0) {
            fetchQ.push(micka.createQ2(bQ, 'Abstract like '));
        }

        if (cQ.length > 0) {
            fetchQ.push(micka.createQ1(cQ, 'Subject=') + ' OR ' + micka.createQ2(cQ, 'Title like ') + ' OR ' + micka.createQ2(cQ, 'Abstract like '));
        }

        //fetchQ.push(micka.createQ2(aQ, 'Anytext like '));


        /*
        1) *keyword* => subject, title
        2) *narrower*, *related* => subject, title
        3) *keyword* => abstract
        4) *narrower*, *related* => abstract
        5) *broader*, *narrower+* => subject, title
        6) *broader*, *narrower+* => abstract
        */

        let prefix = 'https://egdi.geology.cz/csw/?request=GetRecords&query=(';
        let suffix = `)&MaxRecords=${parseInt($('#maxResults').val(), 10)}&format=application/json&language=eng&ElementSetName=full`;
        let results = []; //alle Ergebnisse (doppelte Einträge) mit id, title, abstract, keywords, rank, relevance,

        (async function loop() {

            for (let i = 0; i < fetchQ.length; i++) { //to run all queries

                if (results.length > parseInt($('#maxResults').val(), 10) - 1) { //to get a maximum of x results
                    break;
                }

                if (fetchQ[i].length > 5) {
                    await fetch(prefix + fetchQ[i] + suffix)
                        .then(res => res.text())
                        .then(text => {
                            if (text.includes('<!DOCTYPE html>')) { //repair json+html mix
                                text = text.split('<!DOCTYPE html>')[0] + ']}';
                            }
                            results = micka.addResults(results, JSON.parse(text), rankedTerms);
                        });
                    //console.log(i, results);
                }

            }
            //console.log(results);
            micka.printResults(results.sort((a, b) => b.rank - a.rank), rankedTerms, 'semantic');
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


                //<span class="keywords1" style="cursor:pointer;" onclick="micka.fullTextSearch('${sT}');">${sT}</span>


                let rank = 1;
                let keywords = [];
                for (let b of k) {
                    if (rankedTerms[0].includes(b.toLowerCase())) {
                        keywords.push(`<span class="keywords1" onclick="micka.newSearch('${b}');">${b}</span>`);
                        rank += 10;
                    } else if (rankedTerms[1].includes(b.toLowerCase())) {
                        keywords.push(`<span class="keywords2" onclick="micka.newSearch('${b}');">${b}</span>`);
                        rank += 3;
                    } else if (rankedTerms[2].concat(rankedTerms[3]).includes(b.toLowerCase())) {
                        keywords.push(`<span class="keywords3" onclick="micka.newSearch('${b}');">${b}</span>`);
                        rank += 3;
                    } else if (rankedTerms[4].includes(b.toLowerCase())) {
                        keywords.push(`<span class="keywords4" onclick="micka.newSearch('${b}');">${b}</span>`);
                        rank += 1;
                    } else {
                        keywords.push(`<span class="keywords" onclick="micka.newSearch('${b}');">${b}</span>`);
                    }
                }
                //console.log(k);
                let titleArr = a.title.replace(/[_/,]/g, ' ').split(' ').map(a => a.toLowerCase());
                let abstractArr = a.abstract.replace(/[_/,]/g, ' ').split(' ').map(a => a.toLowerCase());
                //console.log(titleArr,rankedTerms[0]);

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

    printResults: function (results, rankedTerms, searchType) { //HTML erstellen

        $('#1').html(`<strong>${searchType}</strong> search in keywords, title and abstracts texts - `);

        if (results.length > parseInt($('#maxResults').val(), 10)) {
            $('#1').append('more than ');
        }
        $('#1').append(`<strong>${results.length}</strong> results for: <br>`);
        $('#1').append(`<span class="keywords1">${rankedTerms[0].join('</span>, <span class="keywords1">')}</span><br>`);

        if (rankedTerms[1].length > 0) {
            rankedTerms[1].forEach(a => $('#1').append(`<span class="keywords2" onclick="micka.newSearch('${a}');">${a}</span> `));
        }
        if (rankedTerms[2].concat(rankedTerms[3]).length > 0) {
            $('#1').append(`<br>- narrower terms: <br>`);
            rankedTerms[2].concat(rankedTerms[3]).forEach(a => $('#1').append(`<span class="keywords3" onclick="micka.newSearch('${a}');">${a}</span> `));
        }
        if (rankedTerms[4].length > 0) {
            $('#1').append(`<br>- and broader terms: <br>`);
            rankedTerms[4].forEach(a => $('#1').append(`<span class="keywords4" onclick="micka.newSearch('${a}');">${a}</span> `));
        }
        $('#1').append(`<hr>`);

        let mickaViewer = 'https://egdi.geology.cz/record/basic/'; // basic für NEUEN Micka hinzufügen
        //let newAbstract = rankedTerms[1].concat(rankedTerms[2].concat(rankedTerms[3])

        for (let record of results) {
            let newAbstract = record.abstract;
            rankedTerms.flat().forEach(x => newAbstract = newAbstract.split(x).join('<strong>' + x + '</strong>'));

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
                                ${newAbstract}
                            </small>
                        </p>
                        <p  style="line-height: 80%;">
                            ${record.keywords.join(' ')}
                        </p>
                        <hr>`;
        }
        document.getElementById('spinner').style.visibility = 'collapse';
    },

    //******************************************************************************************************

    newSearch: function (term) {

        try {
            let uri = window.fuse.list.find(a => a.L.value === term).URIs.value;
            micka.semanticSearch(uri, term, '');
        } catch (e) {
            ws_micka.json2(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                            select distinct ?s ?L
                            where {
                            values ?p {skos:altLabel skos:prefLabel skos:hiddenLabel}
                            ?s a skos:Concept; ?p ?o; skos:prefLabel ?L
                            FILTER(str(?o)='${term}') FILTER(lang(?L)='${micka.USER_LANG}')
                            }`, data => {

                if (data.results.bindings.length > 0) {
                    console.log(data.results.bindings[0].s.value);
                    micka.semanticSearch(data.results.bindings[0].s.value, data.results.bindings[0].L.value, '');
                } else {
                    micka.fullTextSearch(term);
                    $('#searchInput').val(term);
                }

            });
        }
        document.getElementById('spinner').style.visibility = 'visible';
    },

    //******************************************************************************************************
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

/*
MICKA Error

< !DOCTYPE html > < !--"' --></script></style></noscript></xmp> <
			meta charset = "utf-8" >
			<
			meta name = "robots"
			content = "noindex" >
			<
			title > Server Error < /title>

			<
			style > #error - body {
				background: white;width: 500 px;margin: 70 px auto;padding: 10 px 20 px
			}#
			error - body h1 {
				font: bold 47 px / 1.5 sans - serif;background: none;color: #333; margin: .6em 0 }
	# error - body p {
						font: 21 px / 1.5 Georgia,
						serif;background: none;color: #333; margin: 1.5em 0 }
	# error - body small {
								font - size: 70 % ;
								color: gray
							} <
							/style>

							<
							div id = "error-body" >
							<
							h1 > Server Error < /h1>

							<
							p > We 're sorry! The server encountered an internal error and
						was unable to complete your request.Please
						try again later. < /p>

						<
						p > < small > error 500 < /small></p >
						<
						/div>


*/


function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}
