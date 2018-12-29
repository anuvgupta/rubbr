const port = 3001;

const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const rn = require('random-number');
const alphanum = require('is-alphanumeric');


var app = express();
var server = http.Server(app);
io = socketio(server);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/html/index.html');
});

app.use(express.static('html'));

var interval = 50;
var users = {};
var money = [];
var gates = [];
var lives = [];
var killqueue = [];
var rankings = {
    'last': 0,
    'users': {}
};
var defaults = {
    'gameInterval': 10,
    'syncInterval': 20,
    'speed': 0.65,
    'map': {
        'h': 3000,
        'w': 3000
    },
    'player': {
        'h': 135, // 90
        'w': 90, // 60
        'x': 0,
        'y': 0,
        'money': 0,
        'radius': 35,
        'kills': 0,
        'health': 100
    },
    'boost': {
        'time': 700,
        'speed': 1.3,
        'cost': 20
    },
    'collisions': {
        'bounceFactor': 1.5,
        'healthLost': 25,
        'invulnerableTime': 4000
    },
    'health': {
        'rate': {
            'amount': 1,
            'time': 1000
        }
    },
    'rankings': {
        'refreshTime': 2000
    },
    'money': {
        'h': 25,
        'w': 50,
        'total': 150,
        'radius': 18,
        'border': 30
    },
    'gates': {
        'total': 5,
        'boost': {
            'time': 500,
            'speed': 1.5,
            'cost': 0
        },
        'radius': 95,
        'h': 220,
        'w': 220,
        'border': 200
    },
    'lives': {
        'h': 50,
        'w': 50,
        'radius': 25,
        'value': 20,
        'total': 10,
        'border': 30
    }
};


function summarizeMap() {
    var summary = {
        'users': {},
        'money': {},
        'gates': {},
        'lives': {}
    };
    for (var u in users) {
        summary['users'][u] = {
            'x': users[u]['x'],
            'y': users[u]['y'],
            'v': {
                'm': users[u]['v']['m'],
                'd': users[u]['v']['d']
            },
            'i': users[u]['invulnerable'],
            'n': users[u]['name'],
            'c': users[u]['color']
        };
    }
    for (var m in money) {
        summary['money'][m] = {
            'x': money[m]['x'],
            'y': money[m]['y']
        };
    }
    for (var g in gates) {
        summary['gates'][g] = {
            'x': gates[g]['x'],
            'y': gates[g]['y']
        };
    }
    for (var l in lives) {
        summary['lives'][l] = {
            'x': lives[l]['x'],
            'y': lives[l]['y']
        };
    }
    return summary;
}

function randCoords(offset = 5) {
    return {
        'x': rn({
            min: -1 * defaults['map']['w'] / 2 + offset,
            max: defaults['map']['w'] / 2 - offset,
            integer: true
        }),
        'y': rn({
            min: -1 * defaults['map']['h'] / 2 + offset,
            max: defaults['map']['h'] / 2 - offset,
            integer: true
        })
    };
}

function circularCollision(r0, r1, x0, y0, x1, y1) {
    var d2 = Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2);
    if (Math.pow(r0 - r1, 2) <= d2 && d2 <= Math.pow(r0 + r1, 2))
        return true;
    return false;
    // Formula: (R0-R1)^2 <= (x0-x1)^2+(y0-y1)^2 <= (R0+R1)^2
    // Source: https://stackoverflow.com/questions/8367512/algorithm-to-detect-if-a-circles-intersect-with-any-other-circle-in-the-same-pla
}

function rectangularCollision(w1, h1, x1, y1, w2, h2, x2, y2) {
    if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && h1 + y1 > y2)
        return true;
    return false;
   // Source: https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
}

function rank(a, b) {
    if (a['kills'] > b['kills']) return 1;
    else if (a['kills'] < b['kills']) return -1;
    else {
        if (a['money'] > b['money']) return 1;
        else if (a['money'] < b['money']) return -1;
        else return 0;
    }
}

function randID(length = 10) {
    key = '';
    chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < length; i++)
        key += chars[rn({
            min: 0, max: chars.length - 1, integer: true
        })];
    return key;
}

function randColor() {
    var colors = [ 'red', 'green', 'blue', 'purple', 'yellow', 'black', 'orange' ];
    return colors[rn({
        min: 0, max: colors.length - 1, integer: true
    })];
}


io.on('connection', function (socket) {
    console.log('user[' + socket.id + '] connected');
    socket.on('disconnect', function () {
        console.log('user[' + socket.id + '] disconnected');
        if (users.hasOwnProperty(socket.id)) {
            killqueue.push({
                'id': socket.id,
                'key': users[socket.id]['key'],
                'disconnected': true
            });
        }
    });
    socket.on('login', function (username, rejoin) {
        if (alphanum(username)) {
            var nowTime = Date.now();
            users[socket.id] = {
                'id': socket.id,
                'name': username,
                'key': randID(),
                'color': randColor(),
                'x': defaults['player']['x'],
                'y': defaults['player']['y'],
                'money': defaults['player']['money'],
                'kills': defaults['player']['kills'],
                'health': defaults['player']['health'],
                'invulnerable': false,
                'lastHealth': nowTime,
                'v': {
                    'm': 0,
                    'd': 0,
                    'lastTimestamp': 0,
                    'boost': {
                        '$': false,
                        'time': nowTime,
                        'type': 'none'
                    }
                }
            };
            console.log('user[' + socket.id + '] is ' + username);
            if (rejoin) io.to(socket.id).emit('rejoin');
            else io.to(socket.id).emit('init', socket.id, username, users[socket.id]['color'], JSON.stringify(defaults));
        } else io.to(socket.id).emit('init', false, false, false, false);
    });
    socket.on('sync', function (m, d) {
        if (m > 100) m = 100;
        users[socket.id]['v']['m'] = m;
        users[socket.id]['v']['d'] = d;
    });
    socket.on('boost', function () {
        if (!users[socket.id]['v']['boost']['$']) {
            if (users[socket.id]['money'] < defaults['boost']['cost']) {
                io.to(socket.id).emit('boost', 3);
            } else {
                users[socket.id]['v']['boost']['$'] = true;
                users[socket.id]['v']['boost']['type'] = 'normal';
                users[socket.id]['v']['boost']['time'] = Date.now();
                users[socket.id]['money'] -= defaults['boost']['cost'];
                io.to(socket.id).emit('boost', 1);
            }
        } else io.to(socket.id).emit('boost', 0);
    });
});


server.listen(port, function () {
    console.log('listening on *:' + port);
    // populate map
    for (var m = 0; m < defaults['money']['total']; m++) {
        money.push(randCoords(defaults['money']['border']));
    }
    for (var g = 0; g < defaults['gates']['total']; g++) {
        gates.push(randCoords(defaults['gates']['border']));
    }
    for (var l = 0; l < defaults['lives']['total']; l++) {
        lives.push(randCoords(defaults['lives']['border']));
    }
    // game loop
    setInterval(function () {
        // send each player a map summary
        var mapSummary = summarizeMap();
        for (var u in users) {
            io.to(u).emit('map', JSON.stringify(mapSummary));
        }

        // calculate and send player data
        for (var u in users) {
            // monitor user health
            if (users[u]['health'] <= 0) {
                users[u]['health'] = 0;
                killqueue.push({
                    'id': u,
                    'key': users[u]['key'],
                    'disconnected': false
                });
                continue;
            }
            // calculate position based on passed time and speed and send
            var time = Date.now();
            if (users[u]['v']['lastTimestamp'] == 0) {
                users[u]['x'] = 0;
                users[u]['y'] = 0;
            } else {
                var magnitude = users[u]['v']['m'];
                if (users[u]['v']['boost']['$']) { // apply boost
                    if (users[u]['v']['boost']['type'] == 'gate') {
                        if (time - users[u]['v']['boost']['time'] >= defaults['gates']['boost']['time']) {
                            users[u]['v']['boost']['$'] = false;
                            io.to(u).emit('boost', 2);
                        } else magnitude = 100 * defaults['gates']['boost']['speed'];
                    } else if (users[u]['v']['boost']['type'] == 'normal') {
                        if (time - users[u]['v']['boost']['time'] >= defaults['boost']['time']) {
                            users[u]['v']['boost']['$'] = false;
                            io.to(u).emit('boost', 2);
                        } else magnitude = 100 * defaults['boost']['speed'];
                    }
                }
                var passed = time - users[u]['v']['lastTimestamp'];
                var dx = (magnitude * Math.sin(users[u]['v']['d']) / -10) / defaults['gameInterval'] * passed;
                var dy = (magnitude * Math.cos(users[u]['v']['d']) / 10) / defaults['gameInterval'] * passed;
                users[u]['x'] += dx;
                users[u]['y'] += dy;
                // apply wall colliders
                if (users[u]['x'] >= defaults['map']['w'] / 2) users[u]['x'] = (defaults['map']['w'] / 2) - 1;
                else if (users[u]['x'] <= defaults['map']['w'] / -2) users[u]['x'] = (defaults['map']['w'] / -2) + 1;
                if (users[u]['y'] >= defaults['map']['h'] / 2) users[u]['y'] = (defaults['map']['h'] / 2) - 1;
                else if (users[u]['y'] <= defaults['map']['h'] / -2) users[u]['y'] = (defaults['map']['h'] / -2) + 1;
            }
            users[u]['v']['lastTimestamp'] = time;

            // collisions
            var playerW = defaults['player']['w'];
            var playerH = defaults['player']['h'];
            // calculate money collisions
            for (var m in money) {
                if (circularCollision(defaults['player']['radius'], defaults['money']['radius'], users[u]['x'], users[u]['y'], money[m]['x'], money[m]['y'])) {
                // if (rectangularCollision($playerW, $playerH, $user['x'] - $playerW / 2, $user['y'] - $playerH / 2, $defaults['money']['w'], $defaults['money']['h'], $bill['x'], $bill['y'])) {
                    money[m] = randCoords(defaults['money']['border']);
                    users[u]['money']++;
                }
            }
            // calculate gate collisions
            for (var g in gates) {
                if (circularCollision(defaults['player']['radius'], defaults['gates']['radius'], users[u]['x'], users[u]['y'], gates[g]['x'], gates[g]['y'])) {
                    users[u]['v']['boost']['$'] = true;
                    users[u]['v']['boost']['type'] = 'gate';
                    users[u]['v']['boost']['time'] = Date.now();
                    users[u]['money'] -= defaults['gates']['boost']['cost'];
                    io.to(u).emit('boost', 4);
                    break;
                }
            }
            // calculate life collisions
            for (var l in lives) {
                if (circularCollision(defaults['player']['radius'], defaults['lives']['radius'], users[u]['x'], users[u]['y'], lives[l]['x'], lives[l]['y'])) {
                    lives[l] = randCoords(defaults['lives']['border']);
                    users[u]['health'] += defaults['lives']['value'];
                    if (users[u]['health'] > 100) users[u]['health'] = 100;
                }
            }
            // calculate user collisions
            for (var u2 in users) {
                if (u == u2) continue; // can't collide with yourself
                if (circularCollision(defaults['player']['radius'], defaults['player']['radius'], users[u]['x'], users[u]['y'], users[u2]['x'], users[u2]['y'])) {
                // if (rectangularCollision($playerW, $playerH, $user['x'] - $playerW / 2, $user['y'] - $playerH / 2, $playerW, $playerH, $user2['x'] - $playerW / 2, $user2['y'] - $playerH / 2)) {
                    if (users[u]['v']['boost']['$'] && users[u2]['v']['boost']['$']) { // boost collision, both are boosting
                        console.log('double boost collision between users ' + u + ' and ' + u2);
                    } else if (users[u]['v']['boost']['$'] && !users[u2]['v']['boost']['$']) { // boost collision, favors $user
                        if (users[u2]['invulnerable'] === false) {
                            users[u2]['health'] -= defaults['collisions']['healthLost'];
                            users[u2]['invulnerable'] = Date.now();
                            if (users[u2]['health'] < 0) {
                                users[u2]['health'] = 0;
                                killqueue.push({
                                    'id': u2,
                                    'key': users[u2]['key'],
                                    'disconnected': false
                                });
                            }
                            if (users[u2]['health'] == 0) users[u]['kills'] += 2;
                            else users[u]['kills']++;
                            console.log('single boost collision between users ' + u + ' and ' + u2);
                        }
                    } else if (users[u2]['v']['boost']['$'] && !users[u]['v']['boost']['$']) { // boost collision, favors $user2
                        if (users[u]['invulnerable'] === false) {
                            users[u]['health'] -= defaults['collisions']['healthLost'];
                            users[u]['invulnerable'] = Date.now();
                            if (users[u]['health'] < 0) {
                                users[u]['health'] = 0;
                                killqueue.push({
                                    'id': u,
                                    'key': users[u]['key'],
                                    'disconnected': false
                                });
                            }
                            if (users[u]['health'] == 0) users[u2]['kills'] += 2;
                            else users[u2]['kills']++;
                            console.log('single boost collision between users ' + u2 + ' and ' + u);
                        }
                    } else { // regular collision, neither is boosting
                        time = Date.now();
                        var f, s;
                        if (users[u]['v']['m'] > users[u2]['v']['m']) {
                            f = u; // the faster one is favored
                            s = u2; // the slower one is pushed
                        } else if (users[u2]['v']['m'] > users[u]['v']['m']) {
                            f = u2;
                            s = u;
                        } else continue;
                        var magnitude = users[f]['v']['m'];
                        // use the timestamp of u2, because u1 has just been moved in the outer loop and thus its timestamp has just been updated
                        passed = time - users[u2]['v']['lastTimestamp'];
                        dx = (magnitude * Math.sin(users[f]['v']['d']) / -10) / defaults['gameInterval'] * passed;
                        dy = (magnitude * Math.cos(users[f]['v']['d']) / 10) / defaults['gameInterval'] * passed;
                        users[s]['x'] += dx * defaults['collisions']['bounceFactor'];
                        users[s]['y'] += dy * defaults['collisions']['bounceFactor'];
                        users[s]['v']['lastTimestamp'] = time;
                        console.log('regular collision between users ' + f + ' and ' + s);
                    }
                }
            }

            // calculate invulnerability
            if (!(typeof users[u]['invulnerable'] == typeof true)) {
                time = Date.now();
                var passed = time - users[u]['invulnerable'];
                if (passed >= defaults['collisions']['invulnerableTime'])
                    users[u]['invulnerable'] = false;
            }

            // calculate health
            time = Date.now();
            users[u]['health'] += ((time - users[u]['lastHealth']) / defaults['health']['rate']['time']) * defaults['health']['rate']['amount'];
            if (users[u]['health'] > 100) users[u]['health'] = 100;
            else if (users[u]['health'] < 0) users[u]['health'] = 0;
            users[u]['lastHealth'] = time;

            // send all data to player
            io.to(u).emit('data', users[u]['money'], users[u]['kills'], users[u]['health'], (users[u]['invulnerable'] === false ? false : true));
            io.to(u).emit('position', users[u]['x'], users[u]['y']);
        }

        // rank players
        time = Date.now();
        if (time - rankings['last'] >= defaults['rankings']['refreshTime']) {
            rankings['users'] = [];
            for (var u in users) {
                rankings['users'].push({
                    'id': u,
                    'kills': users[u]['kills'],
                    'money': users[u]['money'],
                    'name': users[u]['name']
                });
            }
            rankings['users'].sort(rank);
            for (var u in users) {
                io.to(u).emit('rankings', JSON.stringify(rankings['users']));
            }
            rankings['last'] = time;
        }

        // kill players
        for  (var k in killqueue) {
            if (users[killqueue[k]['id']]['key'] == killqueue[k]['key']) {
                if (!killqueue[k]['disconnected'])
                    io.to(killqueue[k]['id']).emit('dead');
                delete users[killqueue[k]['id']];
                killqueue.splice(k, 1);
            }
        }
    }, interval);
});
