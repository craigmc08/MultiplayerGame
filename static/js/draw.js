function drawGrid() {
    graph.lineWidth = 1;
    graph.globalAlpha = 0.15;
    graph.strokeStyle = LINE_COLOR;
    graph.beginPath();
    
    for (var x = -camera.x - SCREEN_WIDTH / 2; x < SCREEN_WIDTH; x += SCREEN_HEIGHT / GRID_LINES * zoom) {
        graph.moveTo(x, 0);
        graph.lineTo(x, SCREEN_HEIGHT);
    }
    
    for (var y = -camera.y - SCREEN_HEIGHT / 2; y < SCREEN_HEIGHT; y += SCREEN_HEIGHT / GRID_LINES * zoom) {
        graph.moveTo(0, y);
        graph.lineTo(SCREEN_WIDTH, y);
    }
    
    graph.closePath();
    graph.stroke();
    
    graph.globalAlpha = 1;
}

function drawBackground() {
    graph.fillStyle = BACKGROUND_COLOR;
    graph.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

function drawBounds() {
    var topleft = worldToScreen({x: 0, y: 0});
    var bottomright = worldToScreen({x: GAME_WIDTH, y: GAME_HEIGHT});
    
    graph.globalAlpha = 0.5;
    graph.strokeStyle = BOUNDS_COLOR;
    graph.fillStyle = hsl(0, 0, 0);
    graph.lineWidth = BOUNDS_SIZE;
    
    var x = topleft.x;
    var y = topleft.y;
    var w = bottomright.x - topleft.x;
    var h = bottomright.y - topleft.y;
    graph.strokeRect(topleft.x, topleft.y, bottomright.x - topleft.x, bottomright.y - topleft.y);
}

function drawPlayer(p) {
    // Draw strange appendage
    graph.globalAlpha = 1;
    graph.strokeStyle = hsl(0, 0, 30);
    graph.fillStyle = hsl(0, 0, 60);
    graph.lineWidth = playerConfig.border / 2;
    graph.beginPath();
    var theta1 = p.theta - Math.PI * 0.1;
    var theta2 = p.theta + Math.PI * 0.1;
    graph.moveTo(p.screenX, p.screenY);
    graph.lineTo(p.screenX + (p.r * zoom * 1.5) * Math.sin(theta1), p.screenY + (p.r * 1.5 * zoom) * Math.cos(theta1));
    graph.lineTo(p.screenX + (p.r * zoom * 1.5) * Math.sin(theta2), p.screenY + (p.r * 1.5 * zoom) * Math.cos(theta2));
    graph.lineTo(p.screenX, p.screenY);
    graph.closePath();
    graph.fill();
    graph.stroke();
    
    // Draw main shape
    graph.strokeStyle = hsl(p.hue, playerConfig.colorStroke.saturation, playerConfig.colorStroke.brightness);
    graph.fillStyle = hsl(p.hue, playerConfig.colorFill.saturation, playerConfig.colorFill.brightness);
    graph.lineWidth = playerConfig.border;
    drawRegularPolygon(p.screenX, p.screenY, p.r, PLAYER_SIDES, p.theta);
    
    // Draw name
    graph.fillStyle = playerConfig.nameColor;
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = '20px Roboto';
    graph.fillText(p.name, p.screenX, p.screenY, p.r * 2);
    
    // Draw health bar
    graph.fillStyle = HEALTH_BAR_COLOR_NONE;
    var hbarw = p.r * zoom * 2 * 1.41;
    var hbaryoff = p.r  * zoom * -2 - HEALTH_BAR_HEIGHT;
    graph.fillRect(p.screenX - hbarw / 2, p.screenY + hbaryoff, hbarw, HEALTH_BAR_HEIGHT);
    graph.fillStyle = HEALTH_BAR_COLOR_SOME;
    var hbarfw = hbarw * (p.health / MAX_PLAYER_HEALTH);
    graph.fillRect(p.screenX - hbarw / 2, p.screenY + hbaryoff, hbarfw, HEALTH_BAR_HEIGHT);
}

function drawBullet(b) {
    graph.globalAlpha = 1;
    graph.strokeStyle = hsl(b.hue, bulletConfig.colorStroke.saturation, bulletConfig.colorStroke.brightness);
    graph.fillStyle = hsl(b.hue, bulletConfig.colorFill.saturation, bulletConfig.colorFill.brightness);
    graph.lineWidth = bulletConfig.border;
    drawRegularPolygon(b.screenX, b.screenY, b.r, BULLET_SIDES, map(bulletRotation, 0, bulletRotationFrames, 0, Math.PI * 2));
}

function drawObstacle(o) {
    graph.globalAlpha = 1;
    graph.strokeStyle = hsl(o.hue, obstacleConfig.colorStroke.saturation, obstacleConfig.colorStroke.brightness);
    graph.fillStyle = hsl(o.hue, obstacleConfig.colorFill.saturation, obstacleConfig.colorFill.brightness);
    graph.lineWidth = obstacleConfig.border;
    drawRect(o.screenX, o.screenY, o.w * zoom, o.h * zoom);
}

function drawRegularPolygon(cx, cy, r, n, t) {
    t = t || 0;
    var theta = 0;
    var x = 0;
    var y = 0;
    r *= zoom;
    
    graph.beginPath();
    
    for (var i = 0; i < n; i++) {
        theta = (i / n) * 2 * Math.PI + t;
        x = cx + r * Math.sin(theta);
        y = cy + r * Math.cos(theta);
        graph.lineTo(x, y);
    }
    
    graph.closePath();
    graph.stroke();
    graph.fill();
}

function drawRect(x, y, w, h) {
    graph.fillRect(x, y, w, h);
    graph.strokeRect(x, y, w, h);
}
    
function hsl(h, s, l) {
    return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
}