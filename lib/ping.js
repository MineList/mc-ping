/**
 * mc-ping
 * Copyright (c) 2013 David White
 * MIT Licensed
 **/

var net = require("net");

var ping = function(server, port, callback, timeout) {
	var MC_DEFAULT_PORT = 25565;
	if (typeof port == "function") {
		callback = port;
		port = MC_DEFAULT_PORT;
	}

	if (typeof port !== "number") {
		port = MC_DEFAULT_PORT;
	}

	if (typeof timeout == "undefined") {
		timeout = 3000;
	}
    var send = false;
    const start = Date.now();

	var socket = net.connect({
		port: port,
		host: server
	}, function() {
		buf = new Buffer(2);
		buf[0] = 254;
		buf[1] = 1;
		socket.write(buf);
	});

	socket.setTimeout(timeout, function () {
		if (callback != undefined) {
			callback(new Error("Socket timed out when connecting to " + server + ":" + port), null);
		}
		socket.end();
		socket.destroy();
	});

	socket.on("data", function(data) {
		var newdata = [];
		if (data[0] == 255) { // Server's magic response
			var iszero = false,
				y = 0;
			for (var i =  1; i < data.length; i++) {
				if (data[i] === 0 && iszero) { // Separator
					if (newdata[y].length > 0)
						y++;
					newdata[y] = "";
					continue;
				}
				if (newdata[y] === undefined) {
					newdata[y] = "";
				}
				if (data[i] !== 0) {
					iszero = false;
					var newchar = String.fromCharCode(data[i]);
					if (newchar !== undefined) {
						newdata[y] = newdata[y] + newchar;
					}
				} else {
					iszero = true;
				}
			}
			if (callback !== undefined) {
				data = {};
				data.protocol_version = newdata[1];
				data.minecraft_version = newdata[2];
				data.server_name = (newdata.length == 5 ? '' : newdata[3]);
				data.num_players = (newdata.length == 5 ? newdata[3] : newdata[4]);
				data.max_players = (newdata.length == 5 ? newdata[4] : newdata[5]);
                data.latency = Date.now() - start;
				callback(null, data);
			}
		} else {
			callback("Unexpected data from server", null);
		}
        send = true;
		socket.end();
		socket.destroy();
	});

    socket.once('error', function(e) {
		if (callback !== undefined) {
			callback(e, null);
		}
	});

    socket.once('close', function() {
        if (callback !== undefined && !send) {
            callback("Server closed the connection", null);
        }
    });
};

module.exports = ping;
