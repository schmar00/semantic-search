# semantic-search
Searching a CSW (Geodata catalogue) by external keyword thesaurus (SKOS/RDF). A contribution to the project GeoERA (http://geoera.eu/).
This website provides a semantic layer to search a Catalogue Webservice by keywords. This example is built to search the geocat.ch (https://www.geocat.ch/geonetwork/srv/eng/csw) CSW catalogue web service. For the search logic is used the GEMET thesaurus (https://www.eionet.europa.eu/gemet/en/exports/rdf/latest) hosted at the Geological Survey of Austria (Sparql endpoint http://resource.geolba.ac.at/PoolParty/sparql/keywords).

## Test link
http://www.geolba.net/semantic-search/

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
