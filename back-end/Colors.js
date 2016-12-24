"use strict";

const superagent = require("superagent"),
	$ = require("cheerio");

module.exports = class Color {
	constructor() {

		this.grabColors = this.grabColors.bind(this);
		this._urlFix = this._urlFix.bind(this);
		this._pageGrab = this._pageGrab.bind(this);
		this._flatten = this._flatten.bind(this);
		this._grabInternal = this._grabInternal.bind(this);
		this._grabExternal = this._grabExternal.bind(this);
		this._colorFix = this._colorFix.bind(this);
		this._hsl2hex = this._hsl2hex.bind(this);
		this._rgb2hex = this._rgb2hex.bind(this);
		this._errFix = this._errFix.bind(this);
		this._urlClear = this._urlClear.bind(this);
	}
	_flatten(a) {
		return a.map?[].concat(...a.map(this._flatten)):a;
	}
	_urlFix(link,initial) {

		if(initial) {

 			if(link.indexOf("http") >= 0){
				let url = link.split("/");
				this.url = url[0] + "//" + url[2];
			} else {
				this.url = "http://" + link.split("/")[0];
			}
		} else if(link[0] + link[1] === "//") {
			return "http:" + link;
		} else if(link[0] === "/") {
			return this.url + link;
		} else if(link[0] + link[1] === ".." || link.charCodeAt(0) >= 65 && link.search("http") < 0) {
			return this.org + link;
		} else {
			return link;
		}

	}
	_urlClear(link) {
		let protocol = link.split("//")[0] || "http";

		link = link.replace("https://","")
			.replace("http://","")
			.split("/");

		let url = "";
		for(let i = 0; i < link.length -1 ; i++) {
			url += link[i] + "/";
		}

		url = protocol + "//" + url;
		return url;
	}
	_errFix(errorMain,message,info) {
		if(errorMain.message) {
			if(errorMain.message.search("ENOTFOUND") >= 0) {
				return {
					error : errorMain,
					message : message + " INVALID URL",
					information : info,
				};
			}else {
				return errorMain;
			}
		}else if (info){
			return {
				message : message,
				error : errorMain,
				information : info
			};
		} else {
			return {
				message : message,
				error : errorMain,
			};
		}
	}
	_rgb2hex(rgb) {
		 rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);

		 return (rgb && rgb.length === 4) ? "#" +
		  ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
		  ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
		  ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
	}
	_hsl2hex(hsl) {
		hsl = hsl.substring(hsl.search(/\(/g) + 1,hsl.length)
			.replace(/\)/,"")
			.split(",");

		let hue = parseInt(hsl[0].replace("%","")),
			saturation = parseInt(hsl[1].replace("%",""))/100,
			lightness = parseInt(hsl[2].replace("%",""))/100;

		var chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
		var huePrime = hue / 60;
		var secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

		huePrime = Math.floor(huePrime);
		var red,
			green,
			blue;

		if( huePrime === 0 ){
			red = chroma;
			green = secondComponent;
			blue = 0;
		}else if( huePrime === 1 ){
			red = secondComponent;
			green = chroma;
			blue = 0;
		}else if( huePrime === 2 ){
			red = 0;
			green = chroma;
			blue = secondComponent;
		}else if( huePrime === 3 ){
			red = 0;
			green = secondComponent;
			blue = chroma;
		}else if( huePrime === 4 ){
			red = secondComponent;
			green = 0;
			blue = chroma;
		}else if( huePrime === 5 ){
			red = chroma;
			green = 0;
			blue = secondComponent;
		}

		var lightnessAdjustment = lightness - (chroma / 2);
		red += lightnessAdjustment;
		green += lightnessAdjustment;
		blue += lightnessAdjustment;

		red = Math.round(red * 255);
		green = Math.round(green * 255);
		blue = Math.round(blue * 255);

		let opac = (hsl.length >= 4)? hsl[3] : 1;

		let rgb = "rgba(" + red + "," + green + "," + blue + "," + opac + ")";
		return this._rgb2hex(rgb);
	}
	_colorFix(colors) {
		return colors.map((color) => {
			if(color.length <= 4) {
				color = color[0] +
				color[1] + color[1] +
				color[2] + color[2] +
				color[3] + color[3];
			} else if((/(hsl)|(rgb)/g).test(color) === true) {

				if(color.search("hsl") >= 0) {
					color = this._hsl2hex(color);
				} else {
					color = this._rgb2hex(color);
				}
			}

			return color.toUpperCase();
		})
	}
	_pageGrab(url) {

		return new Promise((res1,rej1) => {
			superagent.get(url)
				.end((err,resp) => {
					if(err || !resp) {
						rej1(this._errFix(err,"Failed getting the page",{page : this.url + url}));
					} else {
						res1(resp.text);
					}
				});
		});
	}
	_grabInternal(page) {
		return new Promise((res1) => {

			let hash = page.match(/(#(([a-fA-F]|[0-9]){6}|([a-fA-F]|[0-9]){3}))/g) || [],
				adv = page.match(/((hsl)|(hsla)|(rgba)|(rgb))(\([^\)]*\))/g) || [];

			res1([hash,adv]);
		});
	}
	_grabExternal(page) {
		return new Promise((res1,rej1) => {
			let links = [];

			$(page).children("head").children("link").map((val,elem) => {

				let href = elem.attribs.href;
				if(
					href && (/.*(.css)$|(.css\?)/gm).test(href) === true ||
					elem.attribs.rel === "stylesheet"
				) {
					links.push(this._urlFix(href));
				}
			});

			let imports = page.match(/(@import)(.|\n)*(\.css)/gm) || [];

			imports.map(val => {
				val = val.replace(/\s/g,"")
					.replace("@import","");
				val = val.substring(1,val.length);
				links.push(this._urlFix(val));
			});

			let promiseChain = links.map(link => new Promise((res2,rej2) => {
				this._pageGrab(link)
					.then(page => {
						this._grabInternal(page)
							.then(colors => res2(colors))
							.catch(err => rej2(this._errFix(err,"Failed extracting external css page")))
					})
					.catch(err => rej2(this._errFix(err,"Failed extracting external css page")));
			}));

			Promise.all(promiseChain)
				.then((data) => res1(data))
				.catch(err => rej1(this._errFix(err,"Failed extracting external css")))
		});
	}
	sortColors(colors,sortType) {
		// from
		//http://runtime-era.blogspot.co.uk/2011/11/grouping-html-hex-colors-by-hue-in.html
	    for (var c = 0; c < colors.length; c++) {

			let color = colors[c];
			colors[c] = {
				hex : color
			}

			var hex = colors[c].hex.substring(1),
	        	r = parseInt(hex.substring(0,2),16)/255,
	        	g = parseInt(hex.substring(2,4),16)/255,
	         	b = parseInt(hex.substring(4,6),16)/255;

	        var max = Math.max.apply(Math, [r,g,b]),
	         	min = Math.min.apply(Math, [r,g,b]);

	        var chr = max-min,
	         	hue = 0,
	         	val = max,
	         	sat = 0;

	        if (val > 0) {
	            /* Calculate Saturation only if Value isn't 0. */
	            sat = chr/val;
	            if (sat > 0) {
	                if (r == max) {
	                    hue = 60*(((g-min)-(b-min))/chr);
	                    if (hue < 0) {hue += 360;}
	                } else if (g == max) {
	                    hue = 120+60*(((b-min)-(r-min))/chr);
	                } else if (b == max) {
	                    hue = 240+60*(((r-min)-(g-min))/chr);
	                }
	            }
	        }

	        colors[c].hue = hue;
	        colors[c].sat = sat;
	        colors[c].val = val;
	    }
		switch(sortType) {
			case "hue-inc" :
				colors = colors.sort(function(a,b){return a.hue - b.hue;});
				break;
			case "sat-inc" :
				colors = colors.sort(function(a,b){return a.sat - b.sat;});
				break;
			case "val-inc" :
				colors = colors.sort(function(a,b){return a.val - b.val;});
				break;
			case "hue-dec" :
				colors = colors.sort(function(a,b){return b.hue - a.hue;});
				break;
			case "val-dec" :
				colors = colors.sort(function(a,b){return b.val - a.val;});
				break;
			case "sat-dec" :
				colors = colors.sort(function(a,b){return b.sat - a.sat;});
				break;
			default :
				return {message : "No sort criteria given",given : sortType}
				break;
		}
	    return colors.map(color => color.hex);
	}
	grabColors(url) {

		return new Promise((res1,rej1) => {

			this._urlFix(url,true);
			this.org = this._urlClear(url) || "";

			this._pageGrab(url)
			.then(page => {

				Promise.all([
					this._grabExternal(page),
					this._grabInternal(page)
				])
				.then(colors => this._flatten(colors))
				.then(colors => this._colorFix(colors))
				.then(data => {

					res1(
						data.sort().filter((val,i) => {
							if(i !== data.length - 1 && data[i] === data[i + 1]) {
								return false;
							} else {
								return true;
							}
					}));
				})
				.catch(err => rej1(err));
			})
			.catch(err => rej1(err));
		});
	}
}
