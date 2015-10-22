var async = require("async"),
  serialport = require("serialport"),
  SerialPort = serialport.SerialPort,
  os = require('os'),
  usb = require('usb'),
  port = null,
  knownDevices = [
    // sudo lsusb -v -d 0403:6015 2>/dev/null | grep Serial
    "DA01ID01"
  ];


function makeParser(cb) {
  var lineBuffer = {timings: [], bits: [], empty: true};
  return function parseLine(line) {
    // TODO: track line numbers
    if (line.toLowerCase().indexOf('start') != -1) {
      return false;
    } else if (line.toLowerCase().indexOf('end') != -1) {
      if (!lineBuffer.empty) {
        cb(lineBuffer);
      }
      lineBuffer = {timings: [], bits: [], empty: true};
    } else {
      var arr = line.split(' ');
      if (arr.length > 2) {
        lineBuffer.bits.push(arr[1].trim());
        lineBuffer.timings.push(arr[2].trim());
        lineBuffer.empty = false;
      }
    }
  }
}


var createPort = function (deviceName) {
  return new SerialPort(
    deviceName, {
      baudrate: 115200,
      databits: 8,
      stopbits: 1,
      parity: 'none',
      parser: serialport.parsers.readline('\n'),
      platformOptions: {
        vmin: 0
      }
    });
};


var handleUSB = function (device, receiver) {
  device.open();
  device.getStringDescriptor(3, function (error, serialnumber) {
    device.close();
    if (error) {
      console.log("error", error);
    } else {
      for (var i = 0; i < knownDevices.length; i++) {
        if (serialnumber == knownDevices[i]) {
          // TODO: get the path to the device
          var devicename = "/dev/tty.usbserial-" + device.serialNumber;
          setTimeout(function () {
            port = createPort(devicename);
            port.on("open", function (error) {
              if (error) {
                port = null;
                console.log('SERIAL ERROR: Failed to open port "' + devicename + '": ' + error);
              } else {
                console.log('SERIAL: Opened port "' + devicename + '"');
                port.on('data', makeParser(receiver));
              }
            });

            port.on('error', function (error) {
              port = null;
              console.log('SERIAL ERROR on "' + devicename + '":', error);
            });
            // TODO: port.close(function)???
          }, 3000);
        }
      }
    }
  });
};


exports.initialize = function (receiver) {
  usb.on('attach', function (device) {
    console.log('SERIAL USB: Device: "' + device.deviceName + ' by "' + device.manufacturer, '" added.');
    handleUSB(device, receiver);
  });

  usb.on('detach', function (device) {
    console.log('SERIAL USB: Device "' + device.deviceName + ' by "' + device.manufacturer, '" removed.');
    port = null;
  });
  usb.getDeviceList().forEach(function (device) {
    console.log('SERIAL USB: Device "' + device.deviceName + ' by "' + device.manufacturer, '" found.');
    handleUSB(device, receiver);
  });
};


exports.send = function (data) {
  console.log("SERIAL: Sending data ...");
  var toSend = data.join(",");
  return port && port.write("P" + toSend + ",S");
};
