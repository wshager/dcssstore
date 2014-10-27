define(["dojo/_base/array","dojo/_base/window"], function(array,win){
	// module:
	//		dcssstore/css
	// summary:
	//		This module provides css utils
	var css = {
		js2css:function(prop) {
			return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
		},
		css2js:function(prop) {
		    return prop.replace(/-\w/g, function(match){
		        return match.charAt(1).toUpperCase();
		    });
		},
		findStyleSheets: function(sheets,doc){
			// Takes an array of stylesheet paths and finds the currently loaded StyleSheet objects matching
			// those names
			doc = doc || win.doc;
			var sheetObjects = [];
			array.forEach(sheets, function(styleSheet){
				var s = css.findStyleSheet(styleSheet,doc);
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
		findStyleSheet: function(sheet,doc){
			// Takes a stylesheet path and finds the currently loaded StyleSheet objects matching
			// those names (and it's parent(s), if it is imported from another)
			doc = doc || win.doc;
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
				var rules = [];
				try {
					rules = styleSheet.cssRules;
				} catch(err) {
					console.warn("Not allowed to read cssRules for stylesheet "+styleSheet.href);
				}
				return array.some(rules, function(rule){
					if(rule.type && rule.type === 3 && _processSS(rule.styleSheet)){// CSSImportRule (firefox)
						return true;
					}
					return false;
				});
			};
			array.some(doc.styleSheets, _processSS);
			return sheetObjects;
		},
		determineContext: function(initialStylesheets,doc){
			// Takes an array of stylesheet paths and returns an array of all stylesheets that fall in the
			// given context.  If no paths are given, all stylesheets are returned.
			doc = doc || win.doc;
			var ret = [];
			if(initialStylesheets && initialStylesheets.length > 0){
				initialStylesheets = css.findStyleSheets(initialStylesheets,doc);
			}else{
				initialStylesheets = doc.styleSheets;
			}
			var _processSS = function(styleSheet){
				ret.push(styleSheet);
				//iterate across rules in the stylesheet
				var rules = [];
				try {
					rules = styleSheet.cssRules;
				} catch(err) {
					console.warn("Not allowed to read cssRules for stylesheet "+styleSheet.href);
				}
				array.forEach(rules, function(rule){
					if(rule.type && rule.type === 3){// CSSImportRule
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
				var rules = [];
				try {
					rules = styleSheet.cssRules;
				} catch(err) {
					console.warn("Not allowed to read cssRules for stylesheet "+styleSheet.href);
				}
				array.forEach(rules, function(rule){
					if(!rule.type || rule.type !== 3){// apply fn to current rule
						fn.call(this, rule, styleSheet);
					}
				});
			});
		}
	};
	
	return css;
});