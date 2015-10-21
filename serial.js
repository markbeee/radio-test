var async = require("async"),
  serialport = require("serialport"),
  SerialPort = serialport.SerialPort,
  os = require('os'),
  usbDetection = require('usb-detection'),
  usb = require('usb'),
  port = null,
  knownDevices = [
    // [vendorID, productID]
    [0x0403, 0x6015]
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
  var devicename;
  for (var i = 0; i < knownDevices.length; i++) {
    if (device.vendorId == knownDevices[i][0] && device.productId == knownDevices[i][1]) {
      if (os.type() === 'Darwin') {
        devicename = "/dev/tty.usbserial-" + device.serialNumber;
      } else {
        device = usb.findByIds(device.vendorId, device.productId);
        console.log("debug", device);
        devicename = '/dev/ttyUSB' + (device.portNumbers[0] - 1).toString();
      }
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
};


exports.initialize = function (receiver) {
  usbDetection.on('add', function (device) {
    console.log('SERIAL USB: Device: "' + device.deviceName + ' by "' + device.manufacturer, '" added.');
    handleUSB(device, receiver);
  });

  usbDetection.on('remove', function (device) {
    console.log('SERIAL USB: Device "' + device.deviceName + ' by "' + device.manufacturer, '" removed.');
    port = null;
  });

  usbDetection.find(function (err, devices) {
    if (err) {
      console.log('SERIAL ERROR:', err);
    }
    else {
      devices.forEach(function (device) {
        console.log('SERIAL USB: Device "' + device.deviceName + ' by "' + device.manufacturer, '" found.');
        handleUSB(device, receiver);
      });
    }
  });
};


exports.send = function (data) {
  console.log("SERIAL: Sending data ...");
  var toSend = data.join(",");
  return port && port.write("P" + toSend + ",S");
};
