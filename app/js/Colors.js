'use strict';

const axios = require('axios'),
	fs = require("mz/fs"),
	$ = require('cheerio');

module.exports = class Color {
	constructor(config) {
		this.url = "";
		this.colorRatio = (config && config.colorRatio)? config.colorRatio : 0.9;
	}
	setUrl(url) {
		url = url.split("/");
		this.url = url[0] + "//" + url[2];
	}
	_flatten(a) {
		return a.map?[].concat(...a.map(this._flatten.bind(this))):a;
	}
	_rand(size){
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < size; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	}
	_linkFix(link) {
		if(link[0] + link[1] === "//" && link.search("http") <= 0)
			return "https:" + link;
		else if(link.search("http") === 0)
			return link;
		else if(link[0] === "/")
			return this.url + link;
		else
			return this.url + "/" + link;
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
	_colorCompare(hex1,hex2) {
		hex1 = hex1.replace("#","");
		hex2 = hex2.replace("#","");

		let r1 = parseInt(hex1.substring(0, 2), 16),
			g1 = parseInt(hex1.substring(2, 4), 16),
			b1 = parseInt(hex1.substring(4, 6), 16);

		let r2 = parseInt(hex2.substring(0, 2), 16),
			g2 = parseInt(hex2.substring(2, 4), 16),
			b2 = parseInt(hex2.substring(4, 6), 16);

		let r = 255 - Math.abs(r1 - r2),
			g = 255 - Math.abs(g1 - g2),
			b = 255 - Math.abs(b1 - b2);

		r /= 255;
		g /= 255;
		b /= 255;

		return (r + g + b) / 3;
	}
	_colorExtract(page) {
		let mult =  page.match(/((hsl)|(hsla)|(rgba)|(rgb))(\([^\)]*\))/g) || [];
		let has = page.match(/(#([a-fA-F]|[0-9])*)/g) || [];

		mult = mult.filter(val => (val.length < 4)? false: true);
		has = has.filter(val => (val.length < 4)? false: true);

		return this._flatten([mult,has]);
	}
	_colorFix(colors) {
		colors = colors.map(color => {
			if(color.length <= 4)
				color = color[0] +
					color[1] + color[1] +
					color[2] + color[2] +
					color[3] + color[3];
			else if(color.search("#") === 0 && color.length > 7)
				return color.substr(0,7);
			else if((/(hsl)|(rgb)/g).test(color) === true) {
				color = color.substring(0,color.search(/\)/) + 1);
				if(color.search("hsl") >= 0)
					return this._hsl2hex(color);
				else
					return this._rgb2hex(color);
			}

			return color;
		});
		return this._flatten(colors);
	}
	_colorSort(colors) {
		let uniqueColor = [],
			uniqueCount = [],
			unique = 0;

		colors.map(color => {
			if(uniqueColor.indexOf(color) == -1) {
				uniqueColor[unique] = color;
				uniqueCount[unique] = 1;
				unique++;
			} else
				uniqueCount[uniqueColor.indexOf(color)]++;

		});

		for(let i = 0;i < uniqueColor.length ; i++)
			for(let j = i + 1;j < uniqueColor.length; j++) {
				if(uniqueColor[i].length < 4)
					break;
				else if(this._colorCompare(uniqueColor[i],uniqueColor[j]) > this.colorRatio) {
						uniqueColor[j] = "";
						uniqueCount[j] = 0;
					}
			}

		uniqueColor = uniqueColor.filter(val => {
			if(val.length < 6)
				return false;
			else
				return true;
		});
		uniqueCount = uniqueCount.filter(val => {
			if(val === 0)
				return false;
			else
				return true;
		});

		let result = uniqueColor.map((val,i) => {
			return {color : val,ammount : uniqueCount[i]};
		});

		result.sort((b,a) => {
			if(a.ammount > b.ammount)
				return 1;
			else if(a.ammount < b.ammount)
				return -1;
			return 0;

		});

		return result;
	}
	_extractExternal(page) {
		return new Promise((res1,rej1) => {
			let links = [];

			$(page).children("head").children("link").map((val,elem) => {
				let href = elem.attribs.href;
				if(href && (/.*(.css)$|(.css\?)/gm).test(href) === true )
					links.push(href);
			});


			if(links.length === 0)
				res1([]);

			let promises = links.map(link => {
				return new Promise((res2,rej2) => {
					axios
						.get(this._linkFix(link))
						.then(data => {
							data = data.data;

							let colors = data.match(/{[^}]*}/gm) || [];
							colors = colors.join("/");

							res2(this._colorExtract(data));
						})
						.catch(err => {
							rej2({reason : "extColorExtractPage",error : err,link : this._linkFix(link)});
						})
				});
			})

			Promise
				.all(promises)
				.then(data => {
					res1(data);
				})
				.catch(err => {
					rej1({reason : "extColorExtract",error : err});
				});
		});
	}
	_extractInternal(page) {
		return new Promise((res1) => {
			res1(this._colorExtract(page));
		});
	}
	_pickColors(val) {
		return val.filter(color => {
			if(color.length < 4)
				return false;
			return true;
		});
	}
	extractColors() {
		return new Promise((res1,rej1) => {
			axios
				.get(this.url)
				.then(data => {
					data = data.data;

					Promise.all([
						this._extractInternal(data),
						this._extractExternal(data),
					])
					.then(colors => this._flatten(colors))
					.then(colors => this._pickColors(colors))
					.then(colors => this._colorFix(colors))
					.then(colors => this._colorSort(colors))
					.then(colors => {
						res1(colors);
					})
					.catch(err => {
						rej1({reason : "mainColorExtract",error : err})
					});
				})
				.catch(err => {
					rej1({reason : "blockedConnection",error : err})
				})
		});
	}
}
