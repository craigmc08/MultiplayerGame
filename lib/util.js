var SAT = require('sat');

var V = SAT.Vector;
var C = SAT.Circle;
var B = SAT.Box;

var config = require('../config');

var playerSize = config.playerSize;
var playerSpeed = config.playerSpeed;
var playerSprintSpeed = config.playerSprintSpeed;
var bulletSize = config.bulletSize;
var bulletSpeed = config.bulletSpeed;
var serverMessageRate = config.serverMessageRate; // Server updates to client per second
var GAME_WIDTH = config.GAME_WIDTH;
var GAME_HEIGHT = config.GAME_HEIGHT;

// Update the given player
module.exports.updatePlayer = function updatePlayer(p, players, bullets, obstacles) {
    if (p) {
        // Update last position
        p.lastpos = p.circle.pos.clone();
        // Set velocity based on movecommands
        var movevelocity = new V(0,0);
        var speed = p.movecommands[4] ? playerSprintSpeed : playerSpeed;
        for (var i = 0; i < 4; i++) {
            if (p.movecommands[i]) {
                if (i % 2 == 0) {
                    // i is even, so change y velocity
                    movevelocity.y += i == 0 ? -speed : speed;
                } else {
                    // i is odd, so change x velocity
                    movevelocity.x += i == 1 ? -speed : speed;
                }
            }
        }

        // Apply drag to velocity
        p.velocity.scale(0.9, 0.9);
        
        // Move player based on velocity and controlled velocity
        p.circle.pos.add(p.velocity);
        p.circle.pos.add(movevelocity);

        // Check bounds
        p.circle.pos.x = p.circle.pos.x < 0 ? 0 : p.circle.pos.x > GAME_WIDTH ? GAME_WIDTH: p.circle.pos.x;
        p.circle.pos.y = p.circle.pos.y < 0 ? 0 : p.circle.pos.y > GAME_HEIGHT ? GAME_HEIGHT: p.circle.pos.y;

        // Check player-player collisions
        for (var i = 0; i < players.length; i++) {
            if (players[i] == p) {
                continue;
            } else {
                var response = new SAT.Response().clear();
                SAT.testCircleCircle(p.circle, players[i].circle, response);
                if (!(response.overlapV.len() == 0)) {
                    p.circle.pos.sub(response.overlapV.scale(0.5, 0.5));
                    players[i].circle.pos.sub(response.overlapV.scale(-0.5, -0.5));
                }
            }
        }
        // Check player-bullet collisions
        for (var i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].origin == p.id) {
                continue;
            } else {
                var response = new SAT.Response().clear();
                SAT.testCircleCircle(p.circle, bullets[i].circle, response);
                if (response.bInA && !(response.overlapV.len() == 0)) {
                    bullets.splice(i, 1);
                    p.velocity.add(response.overlapN.scale(-2, -2));
                }
            }
        }
        for (var i = 0; i < obstacles.length; i++) {
            var response = new SAT.Response().clear();
            SAT.testCirclePolygon(p.circle, obstacles[i].box.toPolygon(), response);
            if (!(response.overlapV.len() == 0)) {
                p.circle.pos.sub(response.overlapV);
            }
        }
    }
    
    return p;
}
// Update the given bullet
module.exports.updateBullet = function updateBullet(b, obstacles) {
    // Update last position
    b.lastpos = b.circle.pos.clone();
    // Move bullet based on velocity
    b.circle.pos.add(b.velocity);
    
    // Check collisions
    for (var i = 0; i < obstacles.length; i++) {
        var response = new SAT.Response().clear();
        SAT.testCirclePolygon(b.circle, obstacles[i].box.toPolygon(), response);
        if (!(response.overlapV.len() == 0)) {
            b.circle.pos.sub(response.overlapV);
            b.velocity.scale(-1, -1);
            b.velocity.reflectN(response.overlapN);
        }
    }
    
    // limit velocity
    if (b.velocity.len2() > Math.pow(config.bulletSpeed, 2)) {
        b.velocity.normalize().scale(config.bulletSpeed, config.bulletSpeed);
    }
    
    return b;
}
// Updates the given obstacle
module.exports.updateObstacle = function updateObstacle(o) {
    return o;
}

// Creates a player from the given socket
module.exports.generateNewPlayer = function generateNewPlayer(socket) {
    var playerID = socket.id;
    var playerName = '';
    var circle = new C(new V(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT), playerSize);
    var hue = Math.random() * 360;
    return {
        id: playerID,
        name: playerName,
        circle: circle,
        lastpos: circle.pos.clone(),
        velocity: new V(0, 0),
        movecommands: [false, false, false, false, false],
        hue: hue
    };
}
// Creates a bullet moving in the given direction from the player specified
module.exports.generateNewBullet = function generateNewBullet(direction, origin) {
    var hue = origin.hue;
    var circle = new C(origin.circle.pos.clone(), bulletSize);
    var velocity = direction.scale(bulletSpeed, bulletSpeed).add(origin.velocity);
    return {
        origin: origin.id,
        circle: circle,
        lastpos: circle.pos.clone(),
        velocity: velocity,
        hue: hue
    };
}
// Creates an obstacle x, y coordiantes with width and height w, h
module.exports.generateNewObstacle = function generateNewObstacle(x, y, w, h) {
    return {
        box: new B(new V(x, y), w, h),
        lastpos: new V(x, y),
        px: new V(x, y),
        velocity: new V(0, 0),
        hue: Math.random() * 360
    };
}

// Only send needed information to client
module.exports.preparePlayerForClient = function preparePlayerForClient(p) {
    return {
        name: p.name,
        x: p.circle.pos.x,
        y: p.circle.pos.y,
        px: p.lastpos.x,
        py: p.lastpos.y,
        r: p.circle.r,
        hue: p.hue
    };
}
module.exports.prepareBulletForClient = function prepareBulletForClient(b) {
    return {
        x: b.circle.pos.x,
        y: b.circle.pos.y,
        px: b.lastpos.x,
        py: b.lastpos.y,
        r: b.circle.r,
        hue: b.hue
    };
}
module.exports.prepareObstacleForClient = function prepareObstacleForClient(o) {
    return {
        x: o.box.pos.x,
        y: o.box.pos.y,
        px: o.lastpos.x,
        py: o.lastpos.y,
        w: o.box.w,
        h: o.box.h,
        hue: o.hue
    };
}

// Makes a player move in the specified direction
module.exports.updatePlayerDirection = function updatePlayerDirection(direction, id) {
    player = players[id];
    player.velocity = direction.scale(playerSpeed, playerSpeed);
}

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