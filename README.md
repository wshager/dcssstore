dcssstore
=========

A bundle of CSS stores for use with dojo, based on the dojo/store API.

CssRules
=========

Query and update CSS in a document like you would use a store:

* query: query by selector (pattern) or object, returns a dojo/Promise that resolves an array of matching CSS rules
* add/put: create a new CSS rule based on:
** an object with selector+style object
** an oject with selector+declaration text
** or simply a string (cssText)
* remove: removes a css rule based on a selector (pattern)
