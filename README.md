dcssstore
=========

A bundle of CSS stores for use with dojo, based on the dojo/store API.

## CssRules

Query and update CSS in a document like you would use a [dojo store](/SitePen/dstore).


### Property Summary

Property | Description
-------- | -----------
`context` | An array of stylesheets to query. By default all available stylesheets will be used.
`target` | A single stylesheet to query. Will be used for add/put/remove. If not available an empty style element will be created upon first add/put.
`document` | The target document element to handle stylesheets from.


### method Summary

Property | Description
-------- | -----------
`query(query,[directives])` | Query by selector string, returns a dojo/Promise that resolves to an array of matching CSS rules.
`add(object&#124;string,[directives])` |  Add a CSS rule. Note: this won't check if the rule already exists!
`put(object&#124;string,[directives])` | Add a CSS rule if it doesn't exist, or update an existing rule.
`remove(selector,[directives])` | Removes a css rule based on a selector.

Add/put expect a string or object as first argument:
* an object with selector+style object
* an oject with selector+declaration text
* or simply a string (cssText)

Add/put/remove directives:
* styleSheetName: the stylesheet to use when adding/updating/removing css rules


## _QueryMixin

Expand the query to an object, using one or more of the following keys:

* selector: the selector text to match.
* cssText: the cssText to match (requires the _PatternMixin to match on globbing patterns).
* style./attr/: match an attribute in the style object.


## _PatternMixin

Use this mixin to have the query (string or object) match a wildcard pattern.


## Example

```javascript
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
```
