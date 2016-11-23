let gulp = require("gulp"),
	sass = require("gulp-sass"),
	autoprefixer = require('gulp-autoprefixer'),
	rename = require("gulp-rename"),
	nodemon = require('gulp-nodemon'),
	handlebars = require("handlebars"),
	gulpHandlebars = require('gulp-handlebars-html')(handlebars),
	browserify = require('gulp-browserify'),
	uglify = require('gulp-uglify'),
	babel = require('gulp-babel'),
	fs = require("mz/fs");

function rand(size){
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < size; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function handleError(err) {
	console.log("\n",err.message.toString(),"\n");
	this.emit('end');
}

let hash = rand(7);

let dir = {
	scssIn : "./app/scss/**/*.scss",
	scssFile : ["./app/scss/main.scss"],
	scssOut : "./public/css/",
	jsIn : "./app/js/**/*.js",
	jsOut : "./public/js/",
	htmlIn : "./app/html/*.html",
	htmlOut : "./public/",
}
/*      HandleBars     */

handlebars.registerHelper('ifFind', function(v1, v2, options) {
	if(v2.search(v1) >= 0)
		return options.fn(this);

	return "";
});

/*      HandleBars     */
/* 		SCSS		  */

gulp.task("scss:build",() => {
	fs.readdirSync(dir.scssOut)
		.map(file => {
			fs.unlink(dir.scssOut + file);
		});

	return gulp.src(dir.scssFile)
	 	.pipe(sass({ style: 'compressed' }).on("error",handleError))
		.pipe(autoprefixer())
		.pipe(rename("main" + hash + ".css"))
		.pipe(gulp.dest(dir.scssOut));
});

gulp.task("scss:watch",() => {
	gulp.watch(dir.scssIn,["scss:build"]);
});

/* 		SCSS		  */
/*		JS				*/

gulp.task("babel:build", () => {
	fs.readdirSync(dir.jsOut)
		.map(file => {
			fs.unlink(dir.jsOut + file);
		});

	return gulp.src(dir.jsIn)
        .pipe(babel({
            presets: ['es2015',"react"]
        }).on("error",handleError))
		.pipe(browserify().on("error",handleError))
//		.pipe(uglify({ preserveComments: 'license' }))
		.pipe(rename((path) => {
			path.basename += hash;
		}))
        .pipe(gulp.dest(dir.jsOut));
});

gulp.task("babel:watch",() => {
	gulp.watch(dir.jsIn,["babel:build"])
})

/*		JS				*/
/*		Index				*/

gulp.task("index:build",["babel:build","scss:build"],() => {
	let js = fs.readdirSync(dir.jsOut),
	css = fs.readdirSync(dir.scssOut);

	fs.readdirSync(dir.htmlOut)
		.map(file => {
			if(file.search(".php") >= 0)
				fs.unlinkSync(dir.htmlOut + file);
	})

	return gulp.src(dir.htmlIn)
		.pipe(gulpHandlebars({js,css}))
		.pipe(gulp.dest(dir.htmlOut));
});
gulp.task("index:watch",["index:build"],() => {
	gulp.watch(dir.htmlIn,["index:build"]);
});

/*		Index				*/
/*		NODE				*/

gulp.task("node:build",[],() => {
	nodemon({
		script: 'index.js',
	}).on("error",handleError);
});

gulp.task("node:watch",["node:build"],() => {
	gulp.watch("./index.js",["node:build"]);
})

/*		NODE				*/
gulp.task("front-end",["babel:watch","scss:watch","index:watch"],() => {});
gulp.task("full",["front-end","node:watch"],() => {});
