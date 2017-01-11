var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SAT = require('sat');

// Import util
var util = require('./lib/util');
// Import objects
var O = require('./lib/physicsobjects');
// Import config settings
var config = require('./config');

var playerSize = config.playerSize;
var playerSpeed = config.playerSpeed;
var playerSprintSpeed = config.playerSprintSpeed;
var bulletSize = config.bulletSize;
var bulletSpeed = config.bulletSpeed;
var serverMessageRate = config.serverMessageRate; // Server updates to client per second
var GAME_WIDTH = config.GAME_WIDTH;
var GAME_HEIGHT = config.GAME_HEIGHT;


var V = SAT.Vector;
var C = SAT.Circle;
var B = SAT.Box;

// Keep track of sockets connected
var sockets = [];

// Variables to keep track of various objects
var players = [];
var bullets = [];
var obstacles = [];

// Test addd obstacle
obstacles.push(util.generateNewObstacle(2250, 2250, 500, 500));

// True if a server messages were sent and the move loop has NOT been run yet
var noMoveSinceServer = false;

app.use(express.static('static'));

io.on('connection', function (socket) {
    players.push(util.generateNewPlayer(socket));
    
    sockets.push(socket);
    
    socket.emit('request_info');
    
    socket.on('connect_info', function (data) {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].name = util.validateName(data.name);
        console.log('A player successfully connected');
        var preparedPlayer = players[pindex].prepareForClient();
        socket.emit('connect_success', preparedPlayer);
        
        socket.emit('game_setup', {width: GAME_WIDTH, height: GAME_HEIGHT, refresh: serverMessageRate});
    });
    
    // Move start commands
    socket.on('move_up', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[0] = true;
    });
    socket.on('move_left', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[1] = true;
    });
    socket.on('move_down', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[2] = true;
    });
    socket.on('move_right', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[3] = true;
    });
    socket.on('start_sprint', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[4] = true;
    });
    // Move stop commands
    socket.on('stop_up', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[0] = false;
    });
    socket.on('stop_left', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[1] = false;
    });
    socket.on('stop_down', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[2] = false;
    });
    socket.on('stop_right', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[3] = false;
    });
    socket.on('stop_sprint', function () {
        var pindex = util.getPlayerIndex(socket.id, players);
        players[pindex].movecommands[4] = false;
    });
    
    socket.on('fire', function (data) {
        var direction = new V(data.x, data.y);
        var dlen = direction.len();
        direction = direction.scale(1 / dlen, 1 / dlen);
        bullets.push(util.generateNewBullet(direction, players[util.getPlayerIndex(socket.id, players)]));
    });
    
    socket.on('disconnect', function() {
        console.log('A player disconnected');
        if (util.getPlayerIndex(socket.id, players) > -1) players.splice(util.getPlayerIndex(socket.id, players), 1);
    });
});

// Send information to all the players
function sendPlayersInfo() {
    noMoveSinceServer = true;
    
    players.forEach(function(p) {
        var sindex = util.getSocketIndex(p.id, sockets);        
        
        // Prepare this player
        var playerToSend = p.prepareForClient();
        
        // Prepare other players (and remove this one)
        var playersToSend = players.slice(0);
        for (var j = playersToSend.length - 1; j >= 0; j--) {
            if (players[j].id == p.id) {
                playersToSend.splice(j, 1);
            }
        }
        playersToSend = playersToSend.map(function (p2) {
            return p2.prepareForClient();
        });
        
        // Prepare bullets
        var bulletsToSend = bullets.map(function (b) {
            return b.prepareForClient();
        });
        
        // Prepare obstacles
        var obstaclesToSend = obstacles.map(function (o) {
            return o.prepareForClient();
        });
        
        // Assemble message
        var message = {
            player: playerToSend,
            players: playersToSend,
            bullets: bulletsToSend,
            obstacles: obstaclesToSend
        };
        
        sockets[sindex].emit('update', message);
    });
}

// Update the position of everything
function moveLoop() {
    // Update players
    //console.log(players.length);
    for (var i = 0; i < players.length; i++) {
        players[i].update(noMoveSinceServer, players, bullets, obstacles);
    }
    
    // Update bullets
    for (var i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update(noMoveSinceServer, obstacles);
        
        // Kill bullet if its too far away
        if (bullets[i].circle.pos.x < 0 || bullets[i].circle.pos.x > GAME_WIDTH || bullets[i].circle.pos.y < 0 || bullets[i].circle.pos.y > GAME_HEIGHT) {
            bullets.splice(i, 1);
            continue;
        }
    }
    
    // Update obstacles
    for (var i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update(noMoveSinceServer);
    }
    
    noMoveSinceServer = false;
}

// Create loops
setInterval(moveLoop, 1000 / 60);
setInterval(sendPlayersInfo, 1000 / serverMessageRate);

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '0.0.0.0';
var serverport = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 80;
http.listen(serverport, ipaddress, function () {
    console.log('Listening on ' + ipaddress + ':' + serverport);
})