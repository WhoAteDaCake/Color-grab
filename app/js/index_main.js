import superagent from "superagent";
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

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

id("grab").onclick = () => {

	let url = id("url").value,
		sortType = id("selector").value;
	if(url.length < 3) {
		alert("Please enter valid url");
		return;
	}
	superagent
		.get("/color")
		.query({url,sortType})
		.end((err,res) => {
			if(!err && Object.prototype.toString.call( res.body ) === '[object Array]' ){
				res = res.body.map((val,i) =>
					<div onClick = {setColor} className = "color" data-color = {val} key = {i} style = {{background : val}}></div>
				);
				ReactDom.render(<div className = "inner">{res}</div>,id("colors"));
			} else {
				let message = JSON.stringify(JSON.parse(res.text),null,4);
				let errorBody = <div key = {1} dangerouslySetInnerHTML = {{__html : syntaxHighlight(message)}}></div>;

				ReactDom.render(<div><pre>{errorBody}</pre></div>,id("colors"));
			}
		});
};
