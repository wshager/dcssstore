define([
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"./css"
], function(declare,win,lang,array,Deferred,css){

	function createSheet(doc) {
		doc = doc || win.doc;
		var style = doc.createElement("style");
		style.appendChild(doc.createTextNode(""));
		doc.head.appendChild(style);
		return style.sheet;
	}
	
	function createQuery(updateTotal) {
		return function query () {
			var newCollection = this.inherited(arguments),
				queryer = newCollection.queryLog[newCollection.queryLog.length - 1].queryer;

			var data = newCollection.data = queryer(this.data);
			newCollection.total = updateTotal ? data.length : this.total;
			return newCollection;
		};
	}
	
	var CssRules = declare(null, {
		target:"", // use a single stylesheet, like a store
		context:null, // initialize "store" with existing stylesheets
		document:null, // document to use for CSS
		constructor:function(params) {
			lang.mixin(this,params);
		},
		open:function(){
			var d = new Deferred();
			var self = this;
			if(this.target) this.context = [this.target];
			var gatherHandle = setInterval(function(){
				try{
					// Funkiness here is due to css that may still be loading.  This throws an DOM Access
					// error if css isnt completely loaded.
					self.resolvedContext = css.determineContext(self.context,self.document);
					if(gatherHandle){
						clearInterval(gatherHandle);
						gatherHandle = null;
					}
					// Handle any fetches that have been queued while we've been waiting on the CSS files
					// to finish
					d.resolve();
				}catch(e){
					console.log("CSS loading, throws",e);
				}
			},250);
			return d;
		},
		query: function(query, options){
			options = options || {};
			query = typeof query == "string" ? {"selector":query} : query;
			var rules = [];
			css.rules.forEach(lang.hitch(this, function(rule, styleSheet){
				var match = true;
				for(var key in query){
					var value = query[key];
					if(!this._containsValue(rule, key, value)){
						match = false;
					}
				}
				if(match){
					rules.push(rule);
				}
			}), this.resolvedContext);
			return rules;
		},
		put: function(data, directives){
			directives = directives || {};
			directives.overwrite = true;
			return this.add(data,directives);
		},
		add: function(data, directives){
			directives = directives || {};
			var isString = typeof data === "string";
			var cssText = isString ? data : "";
			var object = isString ? {} : data;
			var selector = object.selector;
			var style = object.style;
			var key,prop;
			// ignore overwrite
			if(directives.existingRule) directives.overwrite = false;
			
			if(directives.overwrite && selector) {
				// retrieve existing rule
				var rules = this.query(selector);
				directives.existingRule = rules.pop();
				directives.overwrite = false;
				return this.add(data,directives);
			}
			if(directives.existingRule && directives.existingRule.selectorText===selector) {
				if(typeof style == "string") {
					directives.existingRule.cssText = cssText ? cssText : selector + " {" + style + "}";
				} else if(typeof style == "object") {
					for(key in style) {
						prop = css.css2js(key);
						directives.existingRule.style.setProperty(prop,style[key]);
					}
				}
				return directives.existingRule;
			} else {
				var declaration = "";
				if(style) {
					if(typeof style == "string") {
						declaration = style;
					} else if(typeof style == "object") {
						for(key in style) {
							prop = css.js2css(key);
							declaration += prop+":"+style[key]+";";
						}
					}
				}
				var sheet = this.target ? this.getStyleSheet(this.target) : this.getStyleSheet(directives.styleSheetName);
				cssText = cssText ? cssText : selector + " {" + declaration + "}";
				if(!sheet) {
					// insert new style element (href = null)
					sheet = createSheet(this.document);
					this.resolvedContext.push(sheet);
				}
				if(sheet.insertRule){
					sheet.insertRule(cssText, 0);
					return sheet.cssRules[0];
				} else {
					throw new Error("CSS insertRule not supported by this browser");
				}
			}
		},
		remove: function(selector, directives){
			directives = directives || {};
			var sheet = this.target ? this.getStyleSheet(this.target) : this.getStyleSheet(directives.styleSheetName);
			var properties = directives.properties ? directives.properties : directives.property ? [directives.property] : [];
			var index = -1;
			for(var i=0;i<sheet.cssRules.length;i++) {
				if(sheet.cssRules[i].selectorText===selector) {
					if(properties.length>0) {
						array.forEach(properties,function(property){
							sheet.cssRules[i].style[property] = "";
						});
					} else {
						index = i;
					}
					break;
				}
			}
			if(index>-1) {
				sheet.deleteRule(index);
			}
		},
		getStyleSheet:function(styleSheetName,context){
			var sheet;
			styleSheetName = styleSheetName || this.target;
			context = context || this.resolvedContext;
			for(var i=0;i<context.length;i++){
				if(context[i].href==styleSheetName || context[i].href.indexOf(styleSheetName)>-1) {
					sheet = context[i];
				}
			}
			return sheet;
		},
		_containsValue: function(rule,attribute,query){
			// summary:
			//		Internal function for comparing rules to the query.
			// rule:
			//		The CSS rule.
			// attribute:
			//		The attribute to inspect. Use dcssstore/_QueryMixin to inspect anything other then "selector".
			// query:
			//		The query to match.
			return array.some(this._getValues(rule, attribute), function(possibleValue){
				return query === possibleValue;
			});
		},
		_getValues: function(rule, attribute){
			var value;
			if(attribute === "selector"){
				value = rule["selectorText"];
				if(value && typeof value == "string"){
					value = value.split(",");
				}
			} else {
				value = [];
			}
			if(value !== undefined){
				if(!(typeof value == "object" && value instanceof Array)){
					value = [value];
				}
			}
			return value;
		}
	});
	
	return CssRules;
});
