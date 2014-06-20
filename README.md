dcssstore
=========

A bundle of CSS stores for use with dojo, based on the dojo/store API.

## CssRules

Query and update CSS in a document like you would use a [dojo store](https://github.com/SitePen/dstore).


### Property Summary

Property | Description
-------- | -----------
`context` | An array of stylesheets to query. By default all available stylesheets will be used.
`target` | A single stylesheet to query. Will be used for add/put/remove. If not available an empty style element will be created upon first add/put.
`document` | The target document element to handle stylesheets from.


### Method Summary

Property | Description
-------- | -----------
`open()` | Must be called before using the store. Stylesheets may still be loading, so returns a promise.
`query(query,[directives])` | Query by selector string, returns an array of matching CSS rules.
`add(data¹,[directives])` |  Add a CSS rule. Note: this won't check if the rule already exists! Returns the inserted rule. 
`put(data¹,[directives])` | Add a CSS rule if it doesn't exist, or update an existing rule. Returns the inserted/updated rule.
`remove(selector,[directives])` | Removes a css rule based on a selector.

1) Add/put handles data as either a string (like cssText) or an object, where: 

Property | Description
-------- | -----------
`selector` | A string holding the selector text of the rule to add/update.
`style` | Either a string (like a style declaration) or a HTML DOM style object.


#### Add/put/remove directives

Property | Description
-------- | -----------
`styleSheetName` | The stylesheet to use when adding/updating/removing css rules
`overwrite` | A boolean indicating that the existing rule with the provided selector is to be overwritten.
`existingRule` | Update styles for this specific rule. When this is set, `overwrite` will be ignored.
`property` | In case of remove, remove this property only.
`properties` | In case of remove, remove these properties only (array).


## _QueryMixin

Expand the query to an object, using one or more of the following properties:

Property | Description
-------- | -----------
`selector` | The selector text to match.
`cssText` | The cssText to match (requires the _PatternMixin to match on globbing patterns).
`style.property` | Match a property in the style object.


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

### Changes in respect to dojox/data/CssRuleStore

CssRules is a replacement for dojox/data/CssRuleStore. The model has been adapted to dojo/store, but other things have changed as well:

* The query always returns the rules themselves, not an array of container items.
* Most query attributes are no longer supported, as they can be inspected on the rules.
* CssRules only works with browsers that support the W3C DOM CSS Level 2 cssRules property. This means Internet Explorer 8 and older are no longer supported.


### TODO

* Add _PersistMixin to be able to save the CSS target file to a remote location.
* Add other types of CSS stores to support more specific subjects like classes, animations or transitions.
* Create an observable CSS store that will emit events whenever an object style changes (either through setting the element style or CSSRule)
