import sa from "superagent";
import React from "react";
import ReactDom from "react-dom";
import Clipboard from "clipboard";

let id = (i) => document.getElementById(i);

function eventFire(el, etype){
	if (el.fireEvent) {
		el.fireEvent('on' + etype);
	} else {
		var evObj = document.createEvent('Events');
		evObj.initEvent(etype, true, false);
		el.dispatchEvent(evObj);
	}
}

function setColor (e) {
	let color = e.target.dataset.color;
	id("selected").value = color;
	new Clipboard(id("copy"));
	eventFire(id("copy"), 'click');
}

id("grab").onclick = () => {

	let url = id("url").value;
	if(url.length < 3) {
		alert("Please enter valid url");
		return;
	}
	sa
		.get("/color")
		.query({url})
		.end((err,res) => {
			res = res.body.map((val,i) =>
				<div onClick = {setColor} className = "color" data-color = {val} key = {i} style = {{background : val}}></div>
			);
			ReactDom.render(<div className = "inner">{res}</div>,id("colors"));
		});
};
