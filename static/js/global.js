// KEYS
var KEY_ESC = 27;
var KEY_FIRE = 32;
var KEY_UP = 87;
var KEY_LEFT = 65;
var KEY_RIGHT = 68;
var KEY_DOWN = 83;
var KEY_SPRINT = 16;
var KEY_ENTER = 13;

// DRAWING
var PLAYER_SIDES = 10;
var BULLET_SIDES = 5;
var BACKGROUND_COLOR = '#f2fbff';
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;
var GRID_LINES = 18;
var LINE_COLOR = '#000000';
var BOUNDS_COLOR = '#000000';
var BOUNDS_SIZE = 30;
var FPS = 60;
var HEALTH_BAR_COLOR_NONE = 'rgb(199, 0, 0)';
var HEALTH_BAR_COLOR_SOME = '#00ff14';
var HEALTH_BAR_HEIGHT = 15;

// SERVER
var DISCONNECTED = false;
var GAME_START = false;
var GAME_WIDTH = 0;
var GAME_HEIGHT = 0;
var SERVER_REFRESH_RATE = 20;
var PLAYER = {};
var MAX_PLAYER_HEALTH = 100;
var ANIM_LOOP_HANDLE;