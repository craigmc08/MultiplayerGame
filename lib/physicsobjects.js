var SAT = require('sat');
var util = require('./util');
var config = require('../config');

var V = SAT.Vector;
var C = SAT.Circle;
var B = SAT.Box;

// Base class
module.exports.PhysicsObject = module.exports.PH = class PhysicsObject {
    constructor(x, y, r) {
        this.circle = new C(new V(x, y), r);
        this.lastPos = this.circle.pos.clone();
        this.velocity = new V();
        this.acceleration = new V();
        this.theta = 0;
    }
    
    update(nmss) {
        if (nmss) this.lastPos.copy(this.circle.pos);
        
        this.velocity.add(this.acceleration);
        this.circle.pos.add(this.velocity);
        this.acceleration.scale(0, 0);
    }
    
    applyForce(f) {
        this.acceleration.add(f);
    }
    
    setDirection(theta) {
        this.theta = theta;
    }
        
    testPoint(a, response) {
        return SAT.pointInCircle(a, this.circle, response);
    }
    testCircle(a, response) {
        return SAT.testCircleCircle(a, this.circle, response);
    }
    testPolygon(b, response) {
        return SAT.testCirclePolygon(this.circle, b, response);
    }
    prepareForClient() {
        return {
            x: this.circle.pos.x,
            y: this.circle.pos.y,
            theta: this.theta,
            r: this.circle.r,
            px: this.lastPos.x,
            py: this.lastPos.y,
        }
    }
}

// Player class
module.exports.PlayerObject = module.exports.P = class PlayerObject extends module.exports.PhysicsObject {
    constructor(id, name, x, y) {
        super(x, y, config.playerSize);
        this.id = id;
        this.name = name;
        this.movevelocity = new V();
        this.hue = Math.random() * 360;
        this.health = config.maxPlayerHealth;
        this.movecommands = [];
        this.sprintSpeed = config.playerSprintSpeed;
        this.normalSpeed = config.playerSpeed;
    }
    
    update(nmss, players, bullets, obstacles) {
        super.update(nmss);
        
        // Handle controls
        this.movevelocity = new V(0,0);
        var speed = this.movecommands[4] ? this.sprintSpeed : this.normalSpeed;
        for (var i = 0; i < 4; i++) {
            if (this.movecommands[i]) {
                if (i % 2 == 0) {
                    // i is even, so change y velocity
                    this.movevelocity.y += i == 0 ? -speed : speed;
                } else {
                    // i is odd, so change x velocity
                    this.movevelocity.x += i == 1 ? -speed : speed;
                }
            }
        }
        // Move player based on controls
        this.circle.pos.add(this.movevelocity);
        
        this.velocity.scale(0.9, 0.9);

        // Check bounds
        this.circle.pos.x = this.circle.pos.x < 0 ? 0 : this.circle.pos.x > config.GAME_WIDTH ? config.GAME_WIDTH: this.circle.pos.x;
        this.circle.pos.y = this.circle.pos.y < 0 ? 0 : this.circle.pos.y > config.GAME_HEIGHT ? config.GAME_HEIGHT: this.circle.pos.y;
        
        // Check collisions
        for (var i = 0; i < players.length; i++) {
            if (players[i].id == this.id) {
                continue;
            } else {
                var response = new SAT.Response().clear();
                this.testCircle(players[i].circle, response);
                if (!(response.overlapV.len() == 0)) {
                    // Collided with player
                    this.circle.pos.add(response.overlapV); // Move this player out of the other one
                    var pushSpeed = new V().copy(this.velocity).add(this.movevelocity).len();
                    players[i].velocity.sub(response.overlapN.scale(pushSpeed, pushSpeed)); // Push the other player based on how fast this one is going
                }
            }
        }
        for (var i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].origin == this.id) {
                continue; // If this was fired from this player don't check for collisions
            } else {
                var response = new SAT.Response().clear();
                this.testCircle(bullets[i].circle, response);
                if (response.aInB && !(response.overlapV.len() == 0)) {
                    // Collided with bullet
                    var pushStrength = bullets[i].circle.r / config.bulletSize * config.bulletPushModifier; // Figure out how much to push the player
                    this.velocity.add(response.overlapN.scale(pushStrength, pushStrength)); // Push player
                    this.health -= bullets[i].getDamage; // Hurt player
                    bullets.splice(i, 1); // Kill bullet (do this after its used for a bunch of other things)
                }
            }
        }
        for (var i = 0; i < obstacles.length; i++) {
            var response = new SAT.Response().clear();
            this.testPolygon(obstacles[i].box.toPolygon(), response);
            if (!(response.overlapV.len() == 0)) {
                // Collided with obstacle
                this.circle.pos.sub(response.overlapV); // Move player out of obstacle
            }
        }
        
        this.health = Math.max(this.health, 0);
    }
    
    prepareForClient() {
        var tmp = super.prepareForClient();
        tmp.name = this.name;
        tmp.health = this.health;
        tmp.hue = this.hue;
        return tmp;
    }
}

// Bullet class
module.exports.BulletObject = module.exports.B = class BulletObject extends module.exports.PhysicsObject {
    constructor(direction, origin) {
        super(origin.circle.pos.x, origin.circle.pos.y, config.bulletSize);
        this.velocity = direction.scale(config.bulletSpeed, config.bulletSpeed);
        this.velocity.add(origin.velocity).add(origin.movevelocity);
        this.origin = origin.id;
        this.hue = origin.hue;
    }
    
    update(nmss, obstacles) {
        super.update(nmss);
        
        // Check bounds (except don't)
        //this.circle.pos.x = this.circle.pos.x < 0 ? 0 : this.circle.pos.x > config.GAME_WIDTH ? config.GAME_WIDTH: this.circle.pos.x;
        //this.circle.pos.y = this.circle.pos.y < 0 ? 0 : this.circle.pos.y > config.GAME_HEIGHT ? config.GAME_HEIGHT: this.circle.pos.y;
        
        // Check collisions
        for (var i = 0; i < obstacles.length; i++) {
            var response = new SAT.Response().clear();
            this.testPolygon(obstacles[i].box.toPolygon(), response);
            if (!(response.overlapV.len() == 0)) {
                // Collided with obstacle
                this.circle.pos.sub(response.overlapV);
                this.velocity.scale(-1, -1);
                this.velocity.reflectN(response.overlapN);
            }
        }
    }
    
    prepareForClient() {
        var tmp = super.prepareForClient();
        tmp.hue = this.hue;
        return tmp;
    }
    
    getDamage() {
        Math.pow(this.circle.r * 2, 2) / Math.pow(config.bulletSize * 2, 2) * config.bulletDamageMultiplier;
    }
}

// Obstacle class
module.exports.ObstacleObject = module.exports.O = class ObstacleObject extends module.exports.PhysicsObject {
    constructor(x, y, w, h) {
        super(x, y, 0);
        delete this.circle;
        this.box = new B(new V(x, y), w, h);
        this.hue = Math.random() * 360;
    }
    
    update(nmss) {
        if (nmss) this.lastPos.copy(this.box.pos);
        
        this.velocity.add(this.acceleration);
        this.box.pos.add(this.velocity);
        this.acceleration.scale(0, 0);
    }
    
    testPoint(a, response) {
        return SAT.pointInPolygon(a, this.box.toPolygon(), response);
    }
    testCircle(a, response) {
        return SAT.testCirclePolygon(a, this.box.toPolygon(), response);
    }
    testPolygon(a, response) {
        return SAT.testPolygonPolygon(a, this.box.toPolygon(), response);
    }
    
    prepareForClient() {
        return {
            x: this.box.pos.x,
            y: this.box.pos.y,
            px: this.lastPos.x,
            py: this.lastPos.y,
            w: this.box.w,
            h: this.box.h,
            hue: this.hue
        }
    }
}