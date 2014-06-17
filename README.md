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


### Method Summary

Property | Description
-------- | -----------
`query(query,[directives])` | Query by selector string, returns a dojo/Promise that resolves to an array of matching CSS rules.
`add(data[1],[directives])` |  Add a CSS rule. Note: this won't check if the rule already exists!
`put(data[1],[directives])` | Add a CSS rule if it doesn't exist, or update an existing rule.
`remove(selector,[directives])` | Removes a css rule based on a selector.

[1] Add/put handles data as either a string (like cssText) or an object, where: 

Property | Description
-------- | -----------
`selector` | A string holding the selector text of the rule to add/update.
`style` | Either a string (like a style declaration) or a HTML DOM style object.


#### Add/put/remove directives

Property | Description
-------- | -----------
`styleSheetName` | the stylesheet to use when adding/updating/removing css rules
`overwrite` | a boolean indicating that the existing rule with the provided selector is to be overwritten.
`existingRule` | update styles for this specific rule. When this is set, `overwrite` will be ignored.
`property` | in case of remove, remove this property only. 


## _QueryMixin

Expand the query to an object, using one or more of the following keys:

* `selector`: the selector text to match.
* `cssText`: the cssText to match (requires the _PatternMixin to match on globbing patterns).
* `style.*attr*`: match an attribute in the style object.


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
