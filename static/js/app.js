var app = angular.module("radioControl", [])
  .run(function(socket) {
    console.log("App is running ...");
  })

  .factory("socket", function() {
    var path = location.pathname.replace(/(.*)(\/.*)/, "$1")
    var socket = io('http://' + location.hostname, {
      path: path + "/socket.io"
    });

    socket.on("connect", function() {
      console.log("Socket is connected");
    });

    socket.on('known signal', function (signal) {
      console.log("Received known signal:", signal);
    });

    socket.on('new signal', function (signal) {
      console.log("Received new signal:", signal);
    });

    socket.on('known signals', function (signals) {
      console.log("Received list of known signals:", signals);
    });

    // sending a signal with a name
    // socket.emit('send signal', $(this).attr('name'));

    return socket;
  })

  .directive("speechInput", function() {
    return {
      scope: {
        callback: "="
      },
      link: function($scope, $element, attrs) {
        var timeout;
        var $span = $element.find("span");
        var originalText = $span.text();

        $element.on("click", function() {
          clearTimeout(timeout);
          $element.addClass("active");
          if (!window.webkitSpeechRecognition) {
            $span.text("No speech support :(");
            return;
          }
          var recognition = new webkitSpeechRecognition();
          recognition.lang = "en-US";
          recognition.onresult = function(event) {
            $element.removeClass("active").addClass("result");
          
            try {
              var result = event.results[0][0].transcript;
            } catch(e) {}
            $span.text(result);
            $scope.callback(result);

            timeout = setTimeout(function() {
              $span.text(originalText);
              $element.removeClass("active result");
            }, 2000);
          };
          recognition.onerror = function(event) {
            $element.removeClass("active result");
          };
          recognition.onend = function(event) {
            $element.removeClass("active");
          };
          recognition.start();
        });
      }
    }
  })

  .controller("CreateCommand1Ctrl", function($scope, $rootScope) {
    $scope.nextPage = function() {
      $rootScope.page = "create_2";
    };
  })

  .controller("CreateCommand2Ctrl", function($scope, $rootScope) {
    $scope.create = function() {
      var command = $scope.command.toLowerCase().replace(/[^a-z'\s0-9]/g, "")
      console.log("create command for", command);
      $rootScope.page = null;
      // TODO: Save new command in backend
    };
  })

  .controller("CommandsListCtrl", function($scope, $rootScope) {
    // TODO: Load commands from backend
    $scope.commands = [
      {
        name: "Light on"
      }, {
        name: "Light off"
      }
    ];

    $scope.findAndExecute = function(name) {
      console.log("find and execute:", name);
      var command = _.findWhere($scope.commands, {
        name: name.toLowerCase()
      });
      if (command) {
        $scope.send(command);
      }
    };

    $scope.goToCreate = function() {
      $rootScope.page = "create_1";
    };

    $scope.send = function() {
      // TODO: Backend logic needed here
    };
  });