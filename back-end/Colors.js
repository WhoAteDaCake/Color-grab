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
	}
	_flatten(a) {
		return a.map?[].concat(...a.map(this._flatten)):a;
	}
	_urlFix(link) {

		if(link[0] + link[1] === "//" && link.search("http") <= 0) {
			return "http:" + link;
		}
		return link;
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
				return color[0] +
				color[1] + color[1] +
				color[2] + color[2] +
				color[3] + color[3];
			} else if((/(hsl)|(rgb)/g).test(color) === true) {
				color = color.substring(0,color.search(/\)/) + 1);
				if(color.search("hsl") >= 0) {
					return this._hsl2hex(color);
				} else {
					return this._rgb2hex(color);
				}
			} else {
				return color;
			}
		})
	}
	_pageGrab(url) {

		return new Promise((res1,rej1) => {
			superagent.get(url)
				.end((err,resp) => {
					if(err) {
						rej1({message : "Failed getting the page",error : err});
					}
					res1(resp.text);
				});
		});
	}
	_grabInternal(page) {
		return new Promise((res1,rej1) => {

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
				if(href && (/.*(.css)$|(.css\?)/gm).test(href) === true ) {
					links.push(this._urlFix(href));
				}
			});

			let promiseChain = links.map(link => new Promise((res2,rej2) => {
				this._pageGrab(link)
					.then(page => {
						this._grabInternal(page)
							.then(colors => res2(colors))
							.catch(err => rej2({message : "Failed extracting external css page",error : err}));
					})
					.catch(err => {
						return rej2({message : "Failed extracting external css page",error : err});
					});
			}));

			Promise.all(promiseChain)
				.then((data) => res1(data))
				.catch(err => rej1({message : "Failed extracting external css",error : err}));
		});
	}
 	grabColors(url) {

		return new Promise((res1,rej1) => {

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
