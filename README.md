# semantic-search
Searching a CSW (Geodata catalogue) by external keyword thesaurus (SKOS/RDF). A contribution to the project GeoERA (http://geoera.eu/).
This website provides a semantic layer to search a Catalogue Webservice by keywords. This example is built to search the EGDI (Micka) (https://egdi.geology.cz/?ak=search). For the search logic is used the GEMET thesaurus (https://www.eionet.europa.eu/gemet/en/exports/rdf/latest) hosted at the Geological Survey of Austria (Sparql endpoint http://resource.geolba.ac.at/PoolParty/sparql/keywords).

## GeoERA/EGDI test link
preview http://www.geolba.net/semantic-search/ prepared for following browser languages: English, German, Spanish, Slovenian, Czech and Danish. This test page doesnot work on MS browsers yet. In general all modern browsers like Firefox, Chrome, Safari (and Edge?) are supported.

# Test link for geocat.ch
for searching the geocat.ch (https://www.geocat.ch/geonetwork/srv/eng/csw) CSW catalogue web service is available under http://www.geolba.net/semantic-search/geocat

## Deployment
* This project is not ready to deploy by installation packages!
* hardcoded urls for testing
* adapted to the GEMET thesaurus
* Javascript coding to be revised (conventions, best practices)!

## Built With
* HTML5, CSS, Javascript, ES6, JQuery
* Fuse.js for fuzzy search - https://github.com/krisk/Fuse
* Bootstrap
* see the [LICENSE.md](LICENSE) file for details

## Authors
* **Martin Schiegl** - *Initial work* 

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE) file for details

# Project GeoERA (http://geoera.eu/):
The project GeoERA GIP-P WP4 initiates, designs, tests the development of vocabulary data within the framework of the GeoERA IP project, which is to support GeoERA projects. This includes suggestions for a technical infrastructure for sustainable data storage, the organization of governance and maintenance of the vocabularies, as well as the technical possibilities of coding data sets with vocabulary (e.g. within the EGDI metadata catalogue). The supported use cases are “Multilingual Semantic Text Search” and “GeoERA project vocabularies” via Linked Open Data and SKOS/RDF.
