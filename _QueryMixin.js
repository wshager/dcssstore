define([
	"dojo/_base/declare",
	"dojo/_base/lang",
], function(declare,lang){

	return declare(null, {
		_getValues: function(rule, attribute){
			var value = null;
			if(attribute === "selector"){
				value = rule["selectorText"];
				if(value && lang.isString(value)){
					value = value.split(",");
				}
			/*}else if(attribute === "classes"){
				// parse out all available class names
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
				value = classes;*/
			}else if(attribute === "cssText"){
				value = rule.cssText;
				if(value){
					value = value.substring(value.indexOf("{"), value.length);
				}
			}else if(attribute.indexOf("style.") === 0){
				var attr = attribute.substring(attribute.indexOf(".")+1, attribute.length);
				value = rule.style[attr];
			}else{
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
	
});
	