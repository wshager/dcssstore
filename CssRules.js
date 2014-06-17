define([
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"./css"
], function(declare,win,lang,array,Deferred,css){

	var createSheet = function(doc) {
		doc = doc || win.doc;
		var style = doc.createElement("style");
		style.appendChild(doc.createTextNode(""));
		doc.head.appendChild(style);
		return style.sheet;
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
		document:null, // document to use for CSS
		constructor:function(options){
			lang.mixin(this, options);
			this._deferredLoad = new Deferred();
			if(this.target) this.context = [this.target];
			var gatherHandle = setInterval(lang.hitch(this,function(){
				try{
					// Funkiness here is due to css that may still be loading.  This throws an DOM Access
					// error if css isnt completely loaded.
					this.resolvedContext = css.determineContext(this.context,this.document);
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
		put: function(data, directives){
			directives = directives || {};
			directives.overwrite = true;
			return this.add(data,directives);
		},
		add: function(data, directives){
			directives = directives || {};
			var d = new Deferred();
			if(!this._deferredLoad.isResolved()){
				this._deferredLoad.then(lang.hitch(this,function(){
					this._add(data, directives, d);
				}));
			}else{
				this._add(data, directives, d);
			}
			return d;
		},
		_add: function(data, directives,d){
			var isString = typeof data == "string";
			var cssText = isString ? data : "";
			var object = isString ? {} : data;
			var selector = object.selector;
			var style = object.style;
			
			// ignore overwrite
			if(directives.existingRule) directives.overwrite = false;
			
			if(directives.overwrite && selector) {
				// retrieve existing rule
				this.query(selector).then(lang.hitch(this,function(rules){
					directives.existingRule = rules.pop();
					directives.overwrite = false;
					this._add(data,directives,d);
				}));
				return;
			}
			
			if(directives.existingRule && directives.existingRule.selectorText===selector) {
				if(typeof style == "string") {
					directives.existingRule.cssText = cssText ? cssText : selector + " {" + style + "}";
				} else if(typeof style == "object") {
					for(var k in style) {
						var v = style[k];
						var prop = css2js(k);
						directives.existingRule.style[prop] = v;
					}
				}
				var sheet = this.target ? this.getStyleSheet(this.target) : this.getStyleSheet(directives.styleSheetName);
				d.resolve(data);
			} else {
				var declaration = "";
				if(style) {
					if(typeof style == "string") {
						declaration = style;
					} else if(typeof style == "object") {
						for(var k in style) {
							var v = style[k];
							var prop = js2css(k);
							if(typeof v != "function" && typeof v !="object") {
								declaration += prop+":"+v+";";
							}
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
					d.resolve(data);
				} else {
					throw new Error("CSS insertRule not supported by this browser");
					d.reject(data);
				}
			}
		},
		remove: function(selector, directives){
			directives = directives || {};
			var d = new Deferred();
			if(!this._deferredLoad.isResolved()){
				this._deferredLoad.then(lang.hitch(this,function(){
					this._remove(object, directives, d);
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
			query = typeof query == "string" ? {"selector":query} : query;
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
			d.resolve(rules);
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
