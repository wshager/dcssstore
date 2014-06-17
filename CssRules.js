define([
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/has",
	"dojo/sniff"
], function(declare,win,lang,array,Deferred,has){

	var patternToRegExp = function(/*String*/pattern, /*boolean?*/ ignoreCase){
		// summary:
		//		Helper function to convert a simple pattern to a regular expression for matching.
		// description:
		//		Returns a regular expression object that conforms to the defined conversion rules.
		//		For example:
		//
		//		- ca*   -> /^ca.*$/
		//		- *ca*  -> /^.*ca.*$/
		//		- *c\*a*  -> /^.*c\*a.*$/
		//		- *c\*a?*  -> /^.*c\*a..*$/
		//
		//		and so on.
		// pattern: string
		//		A simple matching pattern to convert that follows basic rules:
		//
		//		- * Means match anything, so ca* means match anything starting with ca
		//		- ? Means match single character.  So, b?b will match to bob and bab, and so on.
		//		- \ is an escape character.  So for example, \* means do not treat * as a match, but literal character *.
		//
		//		To use a \ as a character in the string, it must be escaped.  So in the pattern it should be
		//		represented by \\ to be treated as an ordinary \ character instead of an escape.
		// ignoreCase:
		//		An optional flag to indicate if the pattern matching should be treated as case-sensitive or not when comparing
		//		By default, it is assumed case sensitive.

		var rxp = "^";
		var c = null;
		for(var i = 0; i < pattern.length; i++){
			c = pattern.charAt(i);
			switch(c){
				case '\\':
					rxp += c;
					i++;
					rxp += pattern.charAt(i);
					break;
				case '*':
					rxp += ".*"; break;
				case '?':
					rxp += "."; break;
				case '$':
				case '^':
				case '/':
				case '+':
				case '.':
				case '|':
				case '(':
				case ')':
				case '{':
				case '}':
				case '[':
				case ']':
					rxp += "\\"; //fallthrough
				default:
					rxp += c;
			}
		}
		rxp += "$";
		if(ignoreCase){
			return new RegExp(rxp,"mi"); //RegExp
		}else{
			return new RegExp(rxp,"m"); //RegExp
		}

	};
	
	var createSheet = function() {
		var style = win.doc.createElement("style");
		style.appendChild(win.doc.createTextNode(""));
		win.head.appendChild(style);
		return style.sheet;
	};
	
	var css = {
		findStyleSheets: function(sheets){
			// Takes an array of stylesheet paths and finds the currently loaded StyleSheet objects matching
			// those names
			var sheetObjects = [];
			array.forEach(sheets, function(styleSheet){
				var s = css.findStyleSheet(styleSheet);
				if(s){
					array.forEach(s, function(sheet){
						if(array.indexOf(sheetObjects, sheet) === -1){
							sheetObjects.push(sheet);
						}
					});
				}
			});
			return sheetObjects;
		},
		findStyleSheet: function(sheet){
			// Takes a stylesheet path and finds the currently loaded StyleSheet objects matching
			// those names (and it's parent(s), if it is imported from another)
			var sheetObjects = [];
			if(sheet.charAt(0) === '.'){
				sheet = sheet.substring(1);
			}
			var _processSS = function(styleSheet){
				if(styleSheet.href && styleSheet.href.match(sheet)){
					sheetObjects.push(styleSheet);
					return true;
				}
				if(styleSheet.imports){
					return array.some(styleSheet.imports, function(importedSS){ //IE stylesheet has imports[] containing @import'ed rules
						//console.debug("Processing IE @import rule",importedSS);
						return _processSS(importedSS);
					});
				}
				//iterate across rules in the stylesheet
				return array.some(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
					if(rule.type && rule.type === 3 && _processSS(rule.styleSheet)){// CSSImportRule (firefox)
						//sheetObjects.push(styleSheet);
						return true;
					}
					return false;
				});
			};
			array.some(document.styleSheets, _processSS);
			return sheetObjects;
		},
		determineContext: function(initialStylesheets){
			// Takes an array of stylesheet paths and returns an array of all stylesheets that fall in the
			// given context.  If no paths are given, all stylesheets are returned.
			var ret = [];
			if(initialStylesheets && initialStylesheets.length > 0){
				initialStylesheets = css.findStyleSheets(initialStylesheets);
			}else{
				initialStylesheets = document.styleSheets;
			}
			var _processSS = function(styleSheet){
				ret.push(styleSheet);
				if(styleSheet.imports){
					array.forEach(styleSheet.imports, function(importedSS){ //IE stylesheet has imports[] containing @import'ed rules
						//console.debug("Processing IE @import rule",importedSS);
						_processSS(importedSS);
					});
				}
				//iterate across rules in the stylesheet
				array.forEach(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
					if(rule.type && rule.type === 3){// CSSImportRule (firefox)
						_processSS(rule.styleSheet);
					}
				});
			};
			array.forEach(initialStylesheets,_processSS);
			return ret;
		}
	};

	css.rules = {};

	css.rules.forEach = function(fn,context){
		if(context){
			array.forEach(context,function(styleSheet){
				//iterate across rules in the stylesheet
				array.forEach(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
					if(!rule.type || rule.type !== 3){// apply fn to current rule with approp ctx. rule is arg (all browsers)
						var href = "";
						if(styleSheet && styleSheet.href){
							href = styleSheet.href;
						}
						fn.call(this,rule, styleSheet, href);
					}
				});
				//process any child stylesheets
			});
		}
	};
	
	var js2css = function(prop) {
		return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
	};
	
	var css2js = function(prop) {
	    return prop.replace(/-\w/g, function(match){
	        return match.charAt(1).toUpperCase();
	    });
	};
	
	var CssRules = declare(null, {
		target:"", // use a single stylesheet, like a store
		context:null, // initialize "store" with existing stylesheets
		constructor:function(options){
			lang.mixin(this, options);
			this._deferredLoad = new Deferred();
			if(this.target) this.context = [this.target];
			var gatherHandle = setInterval(lang.hitch(this,function(){
				try{
					// Funkiness here is due to css that may still be loading.  This throws an DOM Access
					// error if css isnt completely loaded.
					this.resolvedContext = css.determineContext(this.context);
					if(gatherHandle){
						clearInterval(gatherHandle);
						gatherHandle = null;
					}
					// Handle any fetches that have been queued while we've been waiting on the CSS files
					// to finish
					this._deferredLoad.resolve();
				}catch(e){
					console.log("CSS loading, throws",e);
				}
			}),250);
		},
		get: function(id){
		},
		getIdentity: function(object){
		},
		add: function(object, directives){
			return this.put(object, directives);
		},
		put: function(object, directives){
			directives = directives || {};
			var d = new Deferred();
			if(!this._deferredLoad.isResolved()){
				this._deferredLoad.then(lang.hitch(this,function(){
					this._put(object, directives, d);
				}));
			}else{
				this._put(object, directives, d);
			}
			return d;
		},
		_put: function(object, directives,d){
			var styleText = typeof object == "string" ? object : "";
			var selector = object.selector;
			var style = object.style;
			var declaration = "";
			if(object.style) {
				if(typeof object.style == "string") {
					declaration = object.style;
				} else {
					for(var k in object.style) {
						if(isNaN(parseInt(k,10)) && k!="cssText" && k!="length") {
							var v = object.style[k];
							var rule = js2css(k);
							if(typeof v != "function" && typeof v !="object") {
								declaration += rule+":"+v+";";
							}
						}
					}
				}
			} else {
				declaration = object.declaration;
			}
			
			var sheet = this.target ? this.getStyleSheet(this.target) : this.getStyleSheet(directives.styleSheetName);
			styleText = styleText ? styleText : selector + " {" + declaration + "}";
			if(!sheet) {
				// insert new style element and add to context as this.target
			}
			if(sheet.insertRule){
				sheet.insertRule(styleText, 0);
				d.resolve(object);
			} else {
				throw new Error("CSS insertRule not supported by this browser");
				d.reject(object);
			}
		},
		remove: function(selector, directives){
			directives = directives || {};
			var d = new Deferred();
			if(!this._deferredLoad.isResolved()){
				this._deferredLoad.then(lang.hitch(this,function(){
					this._put(object, directives, d);
				}));
			}else{
				this._remove(selector, directives, d);
			}
			return d;
		},
		_remove: function(selector, directives,d){
			var sheet = this.target ? this.getStyleSheet(this.target) : this.getStyleSheet(directives.styleSheetName);
			var declaration = directives.declaration;
			var index = -1;
			for(var i=0;i<sheet.cssRules.length;i++) {
				if(sheet.cssRules[i].selectorText==selector) {
					if(declaration && sheet.cssRules[i].style[declaration]) {
						if(isNaN(parseInt(declaration,10)) && declaration!="cssText" && declaration!="length") {
							var v = sheet.cssRules[i].style[declaration];
							if(v && typeof v != "function" && typeof v !="object") {
								sheet.cssRules[i].style[declaration] = "";
							}
						}
					} else {
						index = i;
					}
					break;
				}
			}
			if(index>-1) {
				sheet.deleteRule(index);
			}
			d.resolve(); //Boolean
		},
		query: function(query, options){
			options = options || {};
			var d = new Deferred();
			if(!this._deferredLoad.isResolved()){
				this._deferredLoad.then(lang.hitch(this,function(){
					this._query(query, options, d);
				}));
			}else{
				this._query(query, options, d);
			}
			return d;
		},
		_query:function(query, options, d){
			var ignoreCase = options.ignoreCase;
			var regexpList = {};
			query = typeof query == "string" ? {"selector":query} : query;
			for(var key in query){
				var value = query[key];
				if(typeof value === "string"){
					regexpList[key] = patternToRegExp(value, ignoreCase);
				}
			}
			var items = [];
			css.rules.forEach(lang.hitch(this, function(rule, styleSheet, href){
				// summary:
				//		Handles the creation of an item based on the passed rule.  In this store, this implies
				//		parsing out all available class names.
				var selector = rule['selectorText'];
				var s = selector.split(" ");
				var classes = [];
				for(var j=0; j<s.length; j++){
					var tmp = s[j];
					var first = tmp.indexOf('.');
					if(tmp && tmp.length > 0 && first !== -1){
						var last = tmp.indexOf(',') || tmp.indexOf('[');
						tmp = tmp.substring(first, ((last !== -1 && last > first)?last:tmp.length));
						classes.push(tmp);
					}
				}
				var item = {};
				item.rule = rule;
				item.styleSheet = styleSheet;
				item.href = href;
				item.classes = classes;
				var match = true;
				for(var key in query){
					var value = query[key];
					if(!this._containsValue(item, key, value, regexpList[key])){
						match = false;
					}
				}
				// TODO always return rule, add util for retrieving other attributes
				if(match){
					items.push(item.rule);
				}
			}), this.resolvedContext);
			d.resolve(items);
		},
		getStyleSheet:function(styleSheetName,context){
			var sheet;
			context = context || this.resolvedContext;
			for(var i=0;i<context.length;i++){
				if(context[i].href==styleSheetName || context[i].href.indexOf(styleSheetName)>-1) {
					sheet = context[i];
				}
			}
			return sheet;
		},
		_containsValue: function(/* item */ item,
				/* attribute-name-string */ attribute,
				/* anything */ value, regexp){
			// summary:
			//		Internal function for looking at the values contained by the item.
			// description:
			//		Internal function for looking at the values contained by the item.  This
			//		function allows for denoting if the comparison should be case sensitive for
			//		strings or not (for handling filtering cases where string case should not matter)
			// item:
			//		The data item to examine for attribute values.
			// attribute:
			//		The attribute to inspect.
			// value:
			//		The value to match.
			// regexp:
			//		Optional regular expression generated off value if value was of string type to handle wildcarding.
			//		If present and attribute values are string, then it can be used for comparison instead of 'value'
			return array.some(this._getValues(item, attribute), function(possibleValue){
				if(possibleValue !== null && !lang.isObject(possibleValue) && regexp){
					if(possibleValue.toString().match(regexp)){
						return true; // Boolean
					}
				} else if(value === possibleValue) {
					return true; // Boolean
				}
				return false;
			});
		},
		_getValues: function(item, attribute){
			var value = null;
			if(attribute === "selector"){
				value = item.rule["selectorText"];
				if(value && lang.isString(value)){
					value = value.split(",");
				}
			}else if(attribute === "classes"){
				value = item.classes;
			}else if(attribute === "rule"){
				value = item.rule;
			}else if(attribute === "style"){
				value = item.rule.style;
			}else if(attribute === "cssText"){
				value = item.rule.cssText;
				if(value){
					value = value.substring(value.indexOf("{"), value.length);
				}
			}else if(attribute === "styleSheet"){
				value = item.rule.styleSheet;
			}else if(attribute === "parentStyleSheet"){
				value = item.rule.parentStyleSheet;
			}else if(attribute === "parentStyleSheetHref"){
				if(item.href){
					value = item.href;
				}
			}else if(attribute.indexOf("style.") === 0){
				var attr = attribute.substring(attribute.indexOf("."), attribute.length);
				value = item.rule.style[attr];
			}else{
				value = [];
			}
			if(value !== undefined){
				if(!lang.isArray(value)){
					value = [value];
				}
			}
			return value;
		}
	});

return CssRules;
});
