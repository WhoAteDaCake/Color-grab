"use strict";

let fs = require("mz/fs");

module.exports = class EHandle{
    constructor(folder) {
        this.folder = folder;
        this.error = this.error.bind(this);
    }
    _timeStamp() {
    // Create a date object with the current time
      var now = new Date();

    // Create an array with the current month, day and time
      var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];

    // Create an array with the current hour, minute and second
      var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

    // If seconds and minutes are less than 10, add a zero
      for ( var i = 1; i < 3; i++ ) {
        if ( time[i] < 10 ) {
          time[i] = "0" + time[i];
        }
      }

    // Return the formatted string
      return date.join("-") + "__" + time.join("-");
    }
    error(text) {

        if(process.env.NODE_ENV === "development"){//if development just log
            console.log(JSON.stringify(text,null,4));
            return;
        }else{
            let time = this._timeStamp();

            fs.writeFile(this.folder + "/err-" + time + ".json",JSON.stringify(text,null,4),(err) =>{
                if(err)
                return err;
                else
                return true;
            });
        }

    }
}
