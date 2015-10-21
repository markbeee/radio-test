var express = require('express'),
  app = express(),
  path = require('path'),
  http = require('http').Server(app),
  io = require('socket.io')(http),
  request = require('request').defaults({json: true}),
  serial = require('./serial.js'),
  storage = require('./storage'),
  analyse = require('./analyse').analyse;


var handleWebhook = function (data, get_or_post) {
  if (typeof data.webhook_send == "string") {
    console.log("Calling webhook on send: ", data['webhook_send']);
    var req = get_or_post === 'post' ? request.post(data['webhook_receive'], data) : request.get(data['webhook_send']);
    req.on('error', function (err) {
      console.log(err)
    });
    req.on('response', function (response) {
      // TODO: Do something with the response?
      console.log("Webhook status code: ", response.statusCode);
    });
  }
};

var createSignalHandler = function (data) {
  return function (signal) {
    if (signal) {
      signal = analyse(signal);
      if (data[signal.identity]) {
        io.emit('known signal', data[signal.identity]);
        // TODO: compare signal quality and replace bad recordings
      } else {
        data[signal.identity] = signal;
        storage.write(data);
        io.emit('new signal', signal);
        io.emit('known signal', signal);
      }
      signal = data[signal.identity];
      handleWebhook(signal, 'post');
    }
  }
};

var main = function () {
  data = storage.read(function (data) {
    // express
    // static file server
    app.use(express.static(path.join(__dirname, './static')));
    // socket.io handlers
    io.on('connection', function (socket) {
      console.log('User connected. Socket id %s', socket.id);
      // send all known
      io.emit('known signals', data);
      socket.on('send signal', function (signal_id) {
        var signal = data[signal_id];
        handleWebhook(signal, "get");
        console.log("Sending Signal to ", signal.name, " (", signal_id, ")");
        serial.send(signal.timings);
      });
      socket.on('renamed signal', function (signal) {
        var old_signal = data[signal.identity];
        console.log("NEW NAME: '", signal.name, "' OLD NAME: '", old_signal.name, "'");
        old_signal.name = signal.name;
        storage.write(data);
      });
      socket.on('disconnect', function () {
        console.log('User disconnected. %s. Socket id %s', socket.id);
      });
    });
// serial console handlers
    serial.start(createSignalHandler(data));
    http.listen(process.env.PORT || 5000, function () {
      console.log('listening on: ' + process.env.PORT || 5000);
    });
  });
};

main();
