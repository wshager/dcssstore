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
				sheet = createSheet(this.document);
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
