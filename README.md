dcssstore
=========

A bundle of CSS stores for use with dojo, based on the dojo/store API.

CssRules
=========

Query and update CSS in a document like you would use a store:

* query: query by selector string, returns a dojo/Promise that resolves to an array of matching CSS rules.
* add/put: create a new CSS rule based on:
  * an object with selector+style object
  * an oject with selector+declaration text
  * or simply a string (cssText)
* remove: removes a css rule based on a selector.


_QueryMixin
=============
Expand the query to an object, using one or more of the following keys:

* selector: the selector text to match.
* cssText: the cssText to match (requires the _PatternMixin to match on globbing patterns).
* style./attr/: match an attribute in the style object.


_PatternMixin
=============

Use this mixin to have the query (string or object) match a wildcard pattern.

Example
=======

{{{
require([
	"dojo/_base/declare",
	"dcssstore/CssRules",
	"dcssstore/_QueryMixin",
	"dcssstore/_PatternMixin"
], function(declare,CssRules,_QueryMixin,_PatternMixin){
	var rulestore = new declare([CssRules,_QueryMixin,_PatternMixin])({
		target:"styles.css"
	});
	// to query by styleText:
	rulestore.query({"styleText":"*color*"}).then(function(rules){
		console.log(rules);
	});
	// to add a style to the document:
	rulestore.put({selector:".clazz",style:{
		color:"red",
		fontSize:"16px"
	}});
	// to remove a style from the document:
	rulestore.remove(".clazz");
});
}}}
