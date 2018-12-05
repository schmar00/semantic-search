let USER_LANG = (navigator.language || navigator.language).substring(0, 2);
let ENDPOINT = 'http://resource.geolba.ac.at/PoolParty/sparql/keywords';


$(document).ready(function () {
    let urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('lang')) {
        USER_LANG = urlParams.get('lang');
    }

    insertSearchCard('search_widget'); //inserts search widget only                

    if (urlParams.has('search')) {
        search(decodeURI(urlParams.get('search')));

    }
    initSearch(); //provides js for fuse search 

});

//***********************search for text typed into the input box***********************************      

function searchTypedText() {
    clearPage();
    loadCSW($('#searchInput').val().split(' '), true, 'And', 1);
    loadCSW($('#searchInput').val().split(' '), false, 'And', 2);
    $('#dropdown').empty();
    $('#searchInput').val('');
}

//***********************set the input box for concept search****************************************      

function insertSearchCard(widgetID) {

    $('#searchInput').keydown(function (e) {
        if (e.which == 13) {
            searchTypedText();
        }
    });

    $('#searchBtn').click(function (e) {  
        searchTypedText();
    });

    $('#searchInput').focusout(function () {
        $('#dropdown').delay(300).hide(0, function () {
            $('#dropdown').empty();
            $('#searchInput').val('');
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
                $.each(autoSuggest.slice(0, 10), function (index, value) {
                    $('#dropdown').append(` <tr>
                                                <td class="searchLink dropdown-item" 
                                                    onclick="semanticSearch('${value.URIs.value}');">
                                                    ${value.L.value}
                                                </td>
                                            </tr>`);
                });
            }
        }, 200);
    });
}

//**********************the initial sparql query to build the fuse (trie) object - stored in window****         

function initSearch() {

    let query = encodeURIComponent(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#> 
                                    SELECT (GROUP_CONCAT(?s; separator = ';') as ?URIs) ?L 
                                    WHERE { 
                                    VALUES ?p {skos:prefLabel skos:altLabel} 
                                    ?s a skos:Concept; ?p ?lEN . FILTER(lang(?lEN)="en")
                                    OPTIONAL{?s ?p ?l . FILTER(lang(?l)="${USER_LANG}")}
                                    BIND(COALESCE(?l, ?lEN) AS ?L)
                                    }
                                    GROUP BY ?L
                                    ORDER BY STRLEN(STR(?L)) ?L`);

    fetch(ENDPOINT + '?query=' + query + '&format=application/json')
        .then(res => res.json())
        .then(jsonData => {
            const options = {
                shouldSort: true,
                tokenize: true,
                keys: ['L.value']
            };
            window.fuse = new Fuse(jsonData.results.bindings, options);
            document.getElementById('searchInput').disabled = false;
        });
}

//************************perform the search for a selected term ************************************         

function semanticSearch(URIs) {

    let data = '';
    let query = encodeURIComponent(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                                    SELECT DISTINCT (MIN(?sort) AS ?rank) ?L
                                    WHERE {
                                    VALUES ?s {<${URIs.replace(/;/g, "> <")}>}
                                    VALUES ?p {skos:broader skos:narrower skos:related}
                                    VALUES ?l {skos:prefLabel skos:altLabel}
                                    {BIND(?s AS ?o) ?o ?l ?L . FILTER(lang(?L)='en') BIND(1 AS ?sort)}
                                    UNION
                                    {?s ?p ?o . ?o ?l ?L . FILTER(lang(?L)='en') BIND(2 AS ?sort)}
                                    UNION
                                    {?s skos:narrower* ?o . ?o ?l ?L . FILTER(lang(?L)='en') BIND(3 AS ?sort)}
                                    }
                                    GROUP BY ?L
                                    ORDER BY ?rank
                                    LIMIT 20`);

    fetch(ENDPOINT + '?query=' + query + '&format=application/json')
        .then(res => res.json())
        .then(data => {
            clearPage();
            loadCSW($.map(data.results.bindings.filter(item => item.rank.value == 1), (a => (a.L.value))), true, 'Or', 1);
            loadCSW($.map(data.results.bindings.filter(item => item.rank.value == 1), (a => (a.L.value))), false, 'Or', 2);
            loadCSW($.map(data.results.bindings.filter(item => item.rank.value == 2), (a => (a.L.value))), true, 'Or', 3);
            loadCSW($.map(data.results.bindings.filter(item => item.rank.value == 3), (a => (a.L.value))), true, 'Or', 4);
            loadCSW($.map(data.results.bindings.filter(item => item.rank.value == 3), (a => (a.L.value))), false, 'Or', 5);
        })
}

//******************************************************************************************************

function clearPage() {
    for (a of document.getElementById('pageContent').childNodes) {
        a.innerHTML = '';
    }
}

//*****************************************************************************************************

function loadCSW(searchTerms, isKeyword, filterLogic, divID) {

    let maxRecords = 3;
    if (searchTerms.length > 0) {

        let geocatViewer = 'https://www.geocat.ch/geonetwork/srv/ger/md.viewer#/full_view/';
        let cswRequest = `https://www.geocat.ch/geonetwork/srv/eng/csw?maxRecords=${maxRecords}
                        &startPosition=1
                        &request=GetRecords
                        &service=CSW
                        &version=2.0.2
                        &resultType=results_with_summary
                        &namespace=xmlns(csw=http://www.opengis.net/cat/csw/2.0.2)
                        &typeNames=csw:Record
                        &constraintLanguage=FILTER
                        &constraint_language_version=1.0.0
                        &elementSetName=full&sortBy=title:A
                        &constraint=`;

        if (isKeyword) { //ogc filter for keyword search

            let ogcFilterKeywordPrefix = '<ogc:PropertyIsEqualTo><ogc:PropertyName>keyword</ogc:PropertyName><ogc:Literal>';
            let ogcFilterKeywordSuffix = '</ogc:Literal></ogc:PropertyIsEqualTo>';
            let keywordFilter = ogcFilterKeywordPrefix + searchTerms.join(ogcFilterKeywordSuffix + ogcFilterKeywordPrefix) + ogcFilterKeywordSuffix;
            cswRequest = encodeURI(`${cswRequest}
                                <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
                                    <ogc:${filterLogic}>
                                        ${keywordFilter}
                                    </ogc:${filterLogic}>
                                </ogc:Filter>`);

        } else { //ogc filter for search texts

            let ogcFilterAnyTextPrefix = '<ogc:PropertyIsLike wildCard="%" singleChar="_" escape="\\"><ogc:PropertyName>dct:abstract</ogc:PropertyName><ogc:Literal>%';
            let ogcFilterAnyTextSuffix = '%</ogc:Literal></ogc:PropertyIsLike>';
            let AnyTextFilter = ogcFilterAnyTextPrefix + searchTerms.join(ogcFilterAnyTextSuffix + ogcFilterAnyTextPrefix) + ogcFilterAnyTextSuffix;
            cswRequest = encodeURI(`${cswRequest}
                                <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
                                    <ogc:${filterLogic}>
                                        ${AnyTextFilter}
                                    </ogc:${filterLogic}>
                                </ogc:Filter>`);

        }

        fetch(cswRequest)
            .then(response => response.text())
            .then(str => (new window.DOMParser()).parseFromString(str, 'text/xml'))
            .then(data => {

                let xmlDoc = data.getElementsByTagName('csw:Record');
                let cswProps = {
                    uuid: 'dc:identifier',
                    title: 'dc:title',
                    abstract: 'dct:abstract',
                    keywords: 'dc:subject'
                };

                if (xmlDoc.length > 0) {
                    let prefixCount = '';
                    let prefixSearchType = 'Abstracts full text: ';
                    if (xmlDoc.length >= maxRecords) {
                        prefixCount = 'more than ';
                    }
                    if (isKeyword) {
                        prefixSearchType = 'Keywords matches: ';
                    }

                    document.getElementById(divID).innerHTML += '<strong class="text-success">' + prefixSearchType + '</strong>' + prefixCount + xmlDoc.length + ' results for <strong class="text-success">' + searchTerms.join(', ') + '</strong><br><br>';

                    for (let record of xmlDoc) {
                        document.getElementById(divID).innerHTML += `
                        <a href="${geocatViewer + record.getElementsByTagName(cswProps.uuid)[0].textContent}">
                            <strong>
                                ${record.getElementsByTagName(cswProps.title)[0].textContent}
                            </strong>
                        </a>
                        <br>
                        <p style="line-height: 80%;">
                            <small>
                                ${record.getElementsByTagName(cswProps.abstract)[0].textContent}
                            </small>
                        </p>
                        <p  style="line-height: 80%;">
                            <span class="keywords1">
                                ${Array.from(record.getElementsByTagName(cswProps.keywords)).map(({
                                    textContent
                                }) => textContent).filter(x => searchTerms.includes(x)).join('</span> <span class="keywords1">')}
                            </span>
                            <span class="keywords2">
                                ${Array.from(record.getElementsByTagName(cswProps.keywords)).map(({
                                    textContent
                                }) => textContent).filter(x => !searchTerms.includes(x)).join('</span> <span class="keywords2">')}
                            </span>
                        </p>`;
                    }
                    document.getElementById(divID).innerHTML += '<hr>';
                }
            });
    }
}
//***********************************************************************************************************      
//********************************END************************************************************************
