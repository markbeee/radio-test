var fs = require('fs'),
  jsonfile = require('jsonfile'),
  util = require('util'),
  _ = require('underscore');

var get_filename = function () {
  try {
    fs.accessSync('/data/');
    return '/data/radio.json';
  }
  catch (err) {
    return '/tmp/radio.json';
  }
};


exports.read = function (cb) {
  var filename = get_filename();
  fs.stat(filename, function (err, stats) {
    if (err) {
      console.log("No previous data detected, creating new base object.");
      cb({});
    } else if (stats.isFile()) {
      console.log("Reading previous data...");
      jsonfile.readFile(filename, function (err, data) {
        if (err) {
          console.log('JSON ERROR: ', err)
        } else {
          cb(data);
        }
      });
    } else {
      console.log("Something's wrong, is '" + filename + "' a directory or something?");
    }
  });
};


exports.write = function (data) {
  var filename = get_filename();
  fs.stat(filename, function (err, stats) {
    if (err) {
      console.log("No previous data detected, creating new file.");
      fs.writeFile(filename, JSON.stringify(data), {}, function (err) {
        if (err) {
          console.log("Error writing file '" + filename + "':", err);
        }
      });
    } else if (stats.isFile()) {
      console.log("Previous file detected, atomically writing new data.");
      var temp_filename = filename + ".tmp";
      fs.writeFile(temp_filename, JSON.stringify(data), {}, function (err) {
        if (!err) {
          fs.rename(temp_filename, filename, function (err) {
            if (err) {
              console.log("Error writing file '" + filename + "':", err);
            }
          });
        } else {
          console.log('File write error!');
        }
      });
    } else {
      console.log("Something's wrong, is '" + filename + "' a directory or something?");
    }
  });
};