"use strict";

process.env.NODE_ENV = 'development'

let superagent = require("superagent"),
    port = 3001;

function rand(size){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < size; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

const express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    http = require("http"),
    fs = require("mz/fs"),
    handlebars = require('handlebars'),
    Color = require("./back-end/Colors.js");

handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
    }[operator];
});

handlebars.registerHelper('ifCond', function(v1, v2, options) {
  if(v1 < v2) {
    return options.fn(this);
  }
  return "";
});

let secret = [
    rand(60),rand(60),rand(60),rand(60)
];

app.use(bodyParser.json());//for  aplication/json
app.use(bodyParser.urlencoded({extended : true}));//for application/x-www-form-urlencoded
app.use(express.static(__dirname + '/public'));

const fileHash = rand(6);


app.get("/",(req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.get("/color",(req, res) => {
	if(!req.query.sortType) {
		req.query.sortType = "hue-inc";
	}

	let extr = new Color();
    extr.grabColors(req.query.url)
        .then((data) => {
            res.json(extr.sortColors(data,req.query.sortType));
        })
        .catch(err => {
            res.send(err);
        })
});

http
    .createServer(app)
    .listen(port, 'localhost', function() {
      console.log("---Server has been started on localhost:" + port + "---");
  });
