define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"./css"
], function(declare,lang,array,css){

	var patternToRegExp = function(/*String*/val, /*boolean?*/ ignoreCase){
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
		var pattern = val.replace(/\s*(\*?\$\^\/+.\|\(\){}\[\],)\s*/g, "{$1}");
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
				case ',':
					rxp += "|"; break;
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
	
	return declare(null, {
		query:function(query, options){
			options = options || {};
			var ignoreCase = options.ignoreCase;
			var regexpList = {};
			query = typeof query == "string" ? {"selector":query} : query;
			for(var key in query){
				var value = query[key];
				if(typeof value === "string"){
					regexpList[key] = patternToRegExp(value, ignoreCase);
				} else if(value instanceof RegExp) {
					regexpList[key] = value;
				}
			}
			var rules = [];
			css.rules.forEach(lang.hitch(this, function(rule, styleSheet){
				var match = true;
				for(var key in query){
					var value = query[key];
					if(!this._containsValue(rule, key, value, regexpList[key])){
						match = false;
					}
				}
				if(match){
					rules.push(rule);
				}
			}), this.resolvedContext);
			return rules;
		},
		_containsValue: function(rule,attribute,query,regexp){
			// regexp:
			//		Optional regular expression generated off value if value was of string type to handle wildcarding.
			//		If present and attribute values are string, then it can be used for comparison instead of 'value'
			return array.some(this._getValues(rule, attribute), function(possibleValue){
				if(possibleValue !== null && !lang.isObject(possibleValue) && regexp){
					if(possibleValue.toString().match(regexp)){
						return true;
					}
				} else if(query === possibleValue) {
					return false;
				}
				return false;
			});
		}
	});
});
	