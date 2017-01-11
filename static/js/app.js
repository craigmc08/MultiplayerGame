var socket;

// Keeps track of camera position
var camera = {
    x: 0,
    y: 0
};
// Keeps track of mouse position
var mouse = {
    x: 0,
    y: 0
};
// Array of players in game
var players = [];
// Array of bullets in the gmae
var bullets = [];
// Keep track of the rotation of bullets
var bulletRotation = 0;
// How long to rotate bullets all the way
var bulletRotationFrames = 200;
// Array of obstacles in the game
var obstacles = [];

// Keep track of time since the last server update
var lastServerUpdateTime = Date.now();
var timeSinceServerUpdate = 0;

var canvas = document.getElementById('canvas');
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;
var graph = canvas.getContext('2d');

// Menu related stuff
var $menu_container = $('#m-container');
function showMenu() {
    $menu_container.show();
}
function hideMenu() {
    $menu_container.hide();1
}

// Position menu
var $menu = $('#menu');
$menu.css('left', (SCREEN_WIDTH - $menu.width()) / 2);
$menu.css('top', (SCREEN_HEIGHT - $menu.height()) / 2 - 100);

// Start game
$('#join').click(function () {
    startGame();
});
$('#name').keypress(function (event) {    
   if (event.keyCode == KEY_ENTER) {
       $('#join').click();
   } 
});

// Join a game
function startGame() {

    // Make sure SCREEN_WIDTH and SCREEN_HEIGHT are right
    // NOTE: in the future these should update when the screen resizes
    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;
    
    hideMenu();

    // Set up socket
    if (!socket) {
        socket = io();
        setupSocket();
    }

    GAME_START = true;
}

// Configs
var colorConfig = {
    colorStroke: {
        saturation: 90,
        brightness: 70
    },
    colorFill: {
        saturation: 100,
        brightness: 80
    }
};
var playerConfig = {
    border: 12,
    nameColor: '#ffffff',
    colorStroke: colorConfig.colorStroke,
    colorFill: colorConfig.colorFill
};
var bulletConfig = {
    border: 6,
    colorStroke: colorConfig.colorStroke,
    colorFill: colorConfig.colorFill
};
var obstacleConfig = {
    border: 6,
    colorStroke: colorConfig.colorStroke,
    colorFill: colorConfig.colorFill
};

// This player
var PLAYER = {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2,
    r: 30,
    target: {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2
    }
};

// Set up socket
function setupSocket() {
    socket.emit('connect_info', {
        name: document.getElementById('name').value
    });
    
    // Handle a connection error
    socket.on('connect_failed', function connect_failed() {
        socket.close();
        DISCONNECTED = true;
    });

    // Handle disconnect
    socket.on('disconnect', function disconnect() {
        socket.close();
        DISCONNECTED = true;
    });

    // Handle successful connection
    socket.on('connect_success', function connect_success(playerSettings) {
        PLAYER = playerSettings;
    });

    // Get information about the game
    socket.on('game_setup', function game_setup(data) {
        GAME_WIDTH = data.width;
        GAME_HEIGHT = data.height;
        SERVER_REFRESH_RATE = data.refresh;
        camera = {
            x: PLAYER.x,
            y: PLAYER.y
        };
    });

    // Update game data based on data from server (about 20Hz) (game/physics calculations are performed server side)
    socket.on('update', function update_players(data) {
        lastServerUpdateTime = Date.now();
        timeSinceServerUpdate = 0;
        PLAYER = data.player;
        players = data.players;
        bullets = data.bullets;
        obstacles = data.obstacles;
    });
}

window.requestAnimFrame = (function () {
    return function (callback) {
        window.setTimeout(callback, 1000 / FPS);
    }
})();

// Client side game loop (input and graphics)
function animLoop() {
    ANIM_LOOP_HANDLE = window.requestAnimFrame(animLoop);
    timeSinceServerUpdate = Date.now() - lastServerUpdateTime;
    //console.log(Math.min(timeSinceServerUpdate / GET_LERP_TIME(), 1));
    gameLoop();
}

//Test data
var test_data = false;
if (test_data) {
    var ptmp = {
        x: 50, 
        y: 50,
        r: 30,
        hue: Math.random() * 360
    };
    var btmp = {
        x: 120,
        y: 50,
        r: 10,
        hue: Math.random() * 360
    };
    var otmp = {
        x: 200,
        y: 300,
        w: 500,
        h: 70,
        hue: Math.random() * 360
    };
}

// All client side game logic is execute here
function gameLoop() {
    graph.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    drawBackground();
    drawGrid();
    drawBounds();

    // Test stuff
    if (test_data) {
        ptmp = updateObject(ptmp);
        btmp = updateObject(btmp);
        otmp = updateObject(otmp);

        drawBullet(btmp);
        drawPlayer(ptmp);
        drawObstacle(otmp);
    }

    if (GAME_START) {
        // Update players
        PLAYER = updateOwnPlayer(PLAYER);
        for (var i = 0; i < players.length; i++) {
            players[i] = updateObject(players[i]);
        }
        // Update bullets
        for (var i = 0; i < bullets.length; i++) {
            bullets[i] = updateObject(bullets[i]);
        }
        // Update obstacles
        for (var i = 0; i < obstacles.length; i++) {
            obstacles[i] = updateObject(obstacles[i]);
        }
        
        // Draw bullets
        bulletRotation += 1;
        bulletRotation %= bulletRotationFrames;
        for (var i = 0; i < bullets.length; i++) {
            drawBullet(bullets[i]);
        }
        // Draw obstacles
        for (var i = 0; i < obstacles.length; i++) {
            drawObstacle(obstacles[i]);
        }
        // Draw players
        drawPlayer(PLAYER);
        for (var i = 0; i < players.length; i++) {
            drawPlayer(players[i]);
        }
    }
    
    $posdisplay.text(Math.round(PLAYER.x) + ', ' + Math.round(PLAYER.y));
}

var $posdisplay = $('#position');

// Update an object
function updateObject(o) {
    var ip = interpolatePosition(o.x, o.y, o.px, o.py);
    
    // Calculate the objects coordinates on screen (based on camera position)
    screenC = worldToScreen({
        x: ip.x,
        y: ip.y
    });
    o.screenX = screenC.x;
    o.screenY = screenC.y;

    return o;
}
// Update this player
function updateOwnPlayer(p) {
    var ip = interpolatePosition(p.x, p.y, p.px, p.py);
    
    p.screenX = SCREEN_WIDTH / 2;
    p.screenY = SCREEN_HEIGHT / 2;
    camera.x = ip.x - p.screenX;
    camera.y = ip.y - p.screenY;
    return p;
}

function interpolatePosition(x, y, px, py) {
    var t = Math.min(timeSinceServerUpdate / GET_LERP_TIME(), 1);
    var ix = lerp(x, px, t);
    var iy = lerp(y, py, t);
    return {x: ix, y: iy};
}

function GET_LERP_TIME() {
    return (1000 / SERVER_REFRESH_RATE) / 2;
}

// Convert world coordinates to screen coordinates
function worldToScreen(pos) {
    return {
        x: pos.x - camera.x,
        y: pos.y - camera.y
    };
}

// Get direction of mouse relative to center of screen
function getDirection() {
    var x = SCREEN_WIDTH / 2 - mouse.x;
    var y = SCREEN_HEIGHT / 2 - mouse.y;
    return {x: -x, y: -y};
}

function map(v, a, b, c, d) {
    return (v - a) / (b - a) * (d - c) + c;
}
function lerp(a, b, t) {
    return a + (a - b) * t;
}
function inverselerp(a, b, v) {
    return (v - a) / (b - a);
}

function shoot() {
    socket.emit('fire', getDirection());
}

// Update mouse movement
$(document).mousemove(function (event) {
    mouse.x = event.pageX;
    mouse.y = event.pageY;
});
    
// Handle keys
keys = [];
$(document).keydown(function (event) {
    var key = event.keyCode;
    if (GAME_START) {
        if (key == KEY_FIRE && !keys[key]) {
            shoot();
        } else if (key == KEY_UP && !keys[key]) {
            socket.emit('move_up');
        } else if (key == KEY_LEFT && !keys[key]) {
            socket.emit('move_left')
        } else if (key == KEY_DOWN && !keys[key]) {
            socket.emit('move_down');
        } else if (key == KEY_RIGHT && !keys[key]) {
            socket.emit('move_right');
        } else if (key == KEY_SPRINT && !keys[key]) {
            socket.emit('start_sprint');
        }
    }
    keys[key] = true;
});
$(document).keyup(function (event) {
    key = event.keyCode;
    keys[key] = false;
    if (GAME_START) {
        if (key == KEY_UP) {
            socket.emit('stop_up');
        } else if (key == KEY_LEFT) {
            socket.emit('stop_left');
        } else if (key == KEY_DOWN) {
            socket.emit('stop_down');
        } else if (key == KEY_RIGHT) {
            socket.emit('stop_right');
        } else if (key == KEY_SPRINT) {
            socket.emit('stop_sprint');
        }
    }
});
$(document).mousedown(function () {
    if (GAME_START) {
        shoot();
    }
});

// Start game loop
animLoop();