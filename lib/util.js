var SAT = require('sat');

var V = SAT.Vector;
var C = SAT.Circle;
var B = SAT.Box;

var O = require('./physicsobjects');
var config = require('../config');

var playerSize = config.playerSize;
var playerSpeed = config.playerSpeed;
var playerSprintSpeed = config.playerSprintSpeed;
var bulletSize = config.bulletSize;
var bulletSpeed = config.bulletSpeed;
var serverMessageRate = config.serverMessageRate; // Server updates to client per second
var GAME_WIDTH = config.GAME_WIDTH;
var GAME_HEIGHT = config.GAME_HEIGHT;

// Creates a player from the given socket
module.exports.generateNewPlayer = function generateNewPlayer(socket) {
    return new O.P(socket.id, '', Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT);
}
// Creates a bullet moving in the given direction from the player specified
module.exports.generateNewBullet = function generateNewBullet(direction, origin) {
    return new O.B(direction, origin);
}
// Creates an obstacle x, y coordiantes with width and height w, h
module.exports.generateNewObstacle = function generateNewObstacle(x, y, w, h) {
    return new O.O(x, y, w, h);
}
// Tries to create a random obstacle
module.exports.tryGenerateNewObstacle = function tryGenerateNewObstacle(obstacles) {
    // Generate random coordinates
    var x = Math.random() * config.GAME_WIDTH;
    var y = Math.random() * config.GAME_HEIGHT;
    // Generate random size
    var w = Math.random() * config.maxObstacleSize + config.minObstacleSize;
    var h = Math.random() * config.maxObstacleSize + config.minObstacleSize;
    // Make sure obstacle doesn't reach out of game area
    w = x + w > config.GAME_WIDTH ? config.GAME_WIDTH - x : w;
    h = y + h > config.GAME_HEIGHT ? config.GAME_HEIGHT - y : h;
    
    var tmpbox = new B(new V(x, y), w, h);
    // Check if it's in another obstacle
    var good = false;
    for (var i = 0; i < obstacles.length; i++) {
        if (obstacles[i].testPolygon(tmpbox.toPolygon())) {
            return false;
        } else {
            continue;
        }
    }
    var obj = module.exports.generateNewObstacle(x, y, w, h);
    //console.log(obj);
    obstacles.push(obj);
    return obj;
};

// 'Cleans' a name sent by player
module.exports.validateName = function validateName(name) {
    // Remove not allowed characters
    return name;
}

// Returns the index of the player with the id given
module.exports.getPlayerIndex = function getPlayerIndex(id, players) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].id == id) {
            return i;
        }
    }
    return -1;
}
// Returns the index of the socket with the id given
module.exports.getSocketIndex = function getSocketIndex(id, sockets) {
    for (var i = 0; i < sockets.length; i++) {
        if (sockets[i].id == id) {
            return i;
        }
    }
    return -1;
}

// Figures out how much damage a bullet does (2PIr)
module.exports.getBulletDamage = function getBulletDamage(b) {
    var damage = Math.pow(b.circle.r * 2, 2) / Math.pow(config.bulletSize * 2, 2) * config.bulletDamageMultiplier;
    return damage;
}