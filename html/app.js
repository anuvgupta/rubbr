var app = {
    id: 0,
    block: Block('div', 'app'),
    pocket: Pocket(),
    server: {
        url: document.domain,
        script: 'rubbr.php',
        port: 8006
    },
    cookie: function (id, val, date) {
        if (Block.is.unset(val))
            document.cookie.split('; ').forEach(function (cookie) {
                if (cookie.substring(0, id.length) == id)
                    val = cookie.substring(id.length + 1);
            });
        else document.cookie = id + '=' + val + (Block.is.set(date) ? '; expires=' + date : '');
        return (Block.is.unset(val) ? null : val);
    },
    connect: function () {
        var pocket = app.pocket;
        pocket.bind('init', function (id, defaults) {
            if (id == false && defaults == false) {
                app.block.child('intro/div/message').on('revalue', {
                    value: 'invalid username'
                });
            } else {
                try {
                    var defaults = JSON.parse(defaults);
                    app.id = id;
                    app.defaults = defaults;
                    app.values.speed = defaults['speed'];
                    app.objects.map.h = defaults['map']['h'];
                    app.objects.map.w = defaults['map']['w'];
                    app.objects.player.x = defaults['player']['x'];
                    app.objects.player.y = defaults['player']['y'];
                    app.objects.player.h = defaults['player']['h'];
                    app.objects.player.w = defaults['player']['w'];
                    app.values.alive = true;
                    app.startGame(defaults['gameInterval']);
                    app.startSync(defaults['syncInterval']);
                } catch (e) {
                    console.log('Failure to parse defaults JSON data');
                    console.log(e);
                }
            }
        });
        pocket.bind('position', function (x, y) {
            if (x < app.objects.map.w / 2 - 1 && x > app.objects.map.w / -2 + 1) {
                if (Math.abs(app.objects.player.x - x) > 2) {
                    app.objects.player.x = x;
                }
            }
            if (y < app.objects.map.h / 2 - 1 && y > app.objects.map.h / -2 + 1) {
                if (Math.abs(app.objects.player.y - y) > 2) {
                    app.objects.player.y = y;
                }
            }
            // var parts = 8;
            // var dx = (app.objects.player.x < x ? 1 : -1) * Math.abs(app.objects.player.x - x) / parts;
            // var dy = (app.objects.player.y < y ? 1 : -1) * Math.abs(app.objects.player.y - y) / parts;
            // var transition;
            // transition = function () {
            //     parts--;
            //     app.objects.player.x += dx;
            //     app.objects.player.y += dy;
            //     if (parts > 0) setTimeout(transition, 1);
            // };
            // transition();
        });
        pocket.bind('map', function (json) {
            try {
                var map = JSON.parse(json);
                app.objects.player['n'] = map['users'][app.id]['n'];
                delete map['users'][app.id];
                var temp = app.objects.server;
                // delete temp['backup'];
                app.objects.server = map;
                app.objects.server['backup'] = temp;
                delete app.objects.server['backup']['backup'];
            } catch (e) {
                console.log('Failure to parse map JSON data');
                console.log(e);
            }
        });
        pocket.bind('boost', function (val) {
            if (val == 0) {
                console.log('cannot stack boosts');
            } else if (val == 1) {
                app.objects.player.v.b = true;
                console.log('boost commenced - normal');
            } else if (val == 2) {
                console.log('boost completed');
            } else if (val == 3) {
                app.block.child('overlays/overlay-money').on('flash', { color: 'white' });
                console.log('no boost money');
            } else if (val == 4) {
                console.log('boost commenced - gate');
            }
        });
        pocket.bind('data', function (money, kills, health, invulnerable) {
            app.block.child('overlays/overlay-money').data({
                money: money
            }).sibling('overlay-kills').data({
                kills: kills
            }).sibling('overlay-health').data({
                health: health
            });
            app.objects.player['i'] = invulnerable;
        });
        pocket.bind('rankings', function (json) {
            try {
                var rankings = JSON.parse(json);
                rankings.reverse();
                app.block.child('overlays/overlay-rankings').on('display', {
                    rankings: rankings
                });
            } catch (e) {
                console.log('Failure to parse rankings JSON data');
                console.log(e);
            }
        });
        pocket.bind('dead', function () {
            console.log('dead!');
            app.values.alive = false;
        });
        pocket.connect(app.server.url, app.server.port, app.server.script, false);
    },
    startSync: function (interval) {
        var syncLoop;
        syncLoop = function () {
            if (app.pocket.online() && app.values.alive) {
                app.pocket.send('sync', app.objects.player.v.m, app.objects.player.v.d);
            }
            setTimeout(syncLoop, interval);
        };
        syncLoop();
        $(document).keypress(function (e) {
            if (e.keyCode == 32) {
                if (app.pocket.online()) {
                    app.pocket.send('boost');
                }
            }
        });
    },
    startGame: function (interval) {
        var gameLoop;
        var $canvas = $('canvas');
        var canvas = $canvas[0];
        var canvas2d = canvas.getContext('2d');
        var values = app.values;
        var objects = app.objects;
        var defaults = app.defaults;
        var player = objects.player;
        var map = objects.map;
        var mouse = objects.mouse;
        $canvas.mousemove(function (e) {
            mouse.x = e.pageX;
            mouse.y = e.pageY;
        });
        var bgimg = $("<img id = 'bgimg'/>");
        bgimg.attr('src', 'img/background-6.png');
        // var carimg = $("<img id = 'carimg'/>");
        // carimg.attr('src', 'img/car.png');
        var dollarimg = $("<img id = 'dollarimg'/>");
        dollarimg.attr('src', 'img/dollar.png');
        var gateimg = $("<img id = 'gateimg'/>");
        gateimg.attr('src', 'img/gate.png');
        var healthimg = $("<img id = 'healthimg'/>");
        healthimg.attr('src', 'img/health.png');
        gameLoop = function () {
            var server = app.objects.server;
            // place canvas in middle
            var xOff = window.innerWidth / 2;
            var yOff = window.innerHeight / 2;
            canvas2d.setTransform(1, 0, 0, 1, 0, 0);
            canvas2d.clearRect(0, 0, canvas.width, canvas.height);
            canvas2d.translate(xOff, yOff);
            // canvas2d.scale(1, -1);
            canvas2d.save();

            // draw background grid
            canvas2d.drawImage(bgimg[0], 0 - player.x - (map.w / 2), 0 - player.y - (map.h / 2));
            canvas2d.restore();
            canvas2d.save();

            // draw money
            for (var m in server.money) {
                var bill = server.money[m];
                canvas2d.drawImage(dollarimg[0], bill['x'] - player.x - (defaults['money']['w'] / 2), bill['y'] - player.y - (defaults['money']['h'] / 2));
                if (values.drawColliders) {
                    canvas2d.beginPath();
                    canvas2d.arc(bill['x'] - player.x, bill['y'] - player.y, app.defaults.money.radius, 0, 2 * Math.PI, false);
                    canvas2d.fillStyle = 'green';
                    canvas2d.fill();
                    canvas2d.restore();
                    canvas2d.save();
                }
            }
            canvas2d.restore();
            canvas2d.save();

            // draw gates
            for (var m in server.gates) {
                var gate = server.gates[m];
                canvas2d.drawImage(gateimg[0], gate['x'] - player.x - (defaults['gates']['w'] / 2), gate['y'] - player.y - (defaults['gates']['h'] / 2));
                if (values.drawColliders) {
                    canvas2d.beginPath();
                    canvas2d.arc(gate['x'] - player.x, gate['y'] - player.y, app.defaults.gates.radius, 0, 2 * Math.PI, false);
                    canvas2d.fillStyle = 'green';
                    canvas2d.fill();
                    canvas2d.restore();
                    canvas2d.save();
                }
            }
            canvas2d.restore();
            canvas2d.save();

            // draw lives
            for (var l in server.lives) {
                var life = server.lives[l];
                canvas2d.drawImage(healthimg[0], life['x'] - player.x - (defaults['lives']['w'] / 2), life['y'] - player.y - (defaults['lives']['h'] / 2));
                if (values.drawColliders) {
                    canvas2d.beginPath();
                    canvas2d.arc(life['x'] - player.x, life['y'] - player.y, app.defaults.money.radius, 0, 2 * Math.PI, false);
                    canvas2d.fillStyle = 'green';
                    canvas2d.fill();
                    canvas2d.restore();
                    canvas2d.save();
                }
            }
            canvas2d.restore();
            canvas2d.save();

            // draw player car
            player.v.d = Math.atan2(xOff - mouse.x, mouse.y - yOff);
            canvas2d.rotate(player.v.d);
            if (player.i) canvas2d.globalAlpha = 0.7;
            else canvas2d.globalAlpha = 1;
            canvas2d.fillStyle = '#6caf46';
            canvas2d.fillRect(0 - player.w / 2, 0 - player.h / 2, player.w, player.h);
            canvas2d.globalAlpha = 1;
            if (values.drawColliders) {
                canvas2d.beginPath();
                canvas2d.arc(0, 0, app.defaults.player.radius, 0, 2 * Math.PI, false);
                canvas2d.fillStyle = 'green';
                canvas2d.fill();
                // canvas2d.restore();
                // canvas2d.save();
            }
            canvas2d.restore();
            canvas2d.save();
            // draw player name
            canvas2d.fillStyle = '#eee';
            canvas2d.font = '17px Trebuchet, Verdana, Helvetica, Arial, sans-serif';
            canvas2d.textAlign = 'center';
            canvas2d.fillText(app.objects.player.n, 0, 5);
            canvas2d.restore();
            canvas2d.save();

            // draw other users
            for (var u in server.users) {
                try {
                    if (u == app.id || Block.is.unset(server.users[u])) continue;
                    var user = server.users[u];
                    var x = server.backup.users[u]['x'] || 0;
                    var y = server.backup.users[u]['y'] || 0;
                    if (user['x'] < map.w / 2 - 1 && user['x'] > map.w / -2 + 1 && Math.abs(x - user['x']) > 2)
                        x = user['x'];
                    if (user['y'] < map.h / 2 - 1 && user['y'] > map.h / -2 + 1 && Math.abs(y - user['y']) > 2)
                        y = user['y'];
                    canvas2d.translate(x - player.x, y - player.y);
                    canvas2d.rotate(user['v']['d']);
                    if (user['i']) canvas2d.globalAlpha = 0.7;
                    else canvas2d.globalAlpha = 1;
                    canvas2d.fillStyle = '#6caf46';
                    var plrDflts = app.defaults['player'];
                    canvas2d.fillRect(0 - plrDflts['w'] / 2, 0 - plrDflts['h'] / 2, plrDflts['w'], plrDflts['h']);
                    canvas2d.globalAlpha = 1;
                    canvas2d.rotate(-1 * user['v']['d']);
                    if (values.drawColliders) {
                        canvas2d.beginPath();
                        canvas2d.arc(0, 0, app.defaults.player.radius, 0, 2 * Math.PI, false);
                        canvas2d.fillStyle = 'green';
                        canvas2d.fill();
                        // canvas2d.restore();
                        // canvas2d.save();
                    }
                    canvas2d.fillStyle = '#eee';
                    canvas2d.font = '17px Trebuchet, Verdana, Helvetica, Arial, sans-serif';
                    canvas2d.textAlign = 'center';
                    canvas2d.fillText(user['n'], 0, 5);
                    canvas2d.restore();
                    canvas2d.save();
                } catch (e) {
                    console.log('error while drawing player ' + u);
                    console.log(e);
                }
            }

            // client-side player speed/position calculations
            var rawSpeed = app.util.dist(0, 0, xOff - mouse.x, yOff - mouse.y);
            player.v.m = rawSpeed / ((xOff > yOff ? yOff : xOff) - 5) * 100 * values.speed;
            if (player.v.m > 100) player.v.m = 100;
            // var dx = player.v.m * Math.sin(player.v.d) / 10;
            // var dy = player.v.m * Math.cos(player.v.d) / -10;
            // player.x += dx;
            // player.y += dy;
            //
            // // client-side player boundary colliders
            // if (player.x >= map.w / 2) player.x = (map.w / 2) - 1;
            // else if (player.x <= map.w / -2) player.x = (map.w / -2) + 1;
            // if (player.y >= map.h / 2) player.y = (map.h / 2) - 1;
            // else if (player.y <= map.h / -2) player.y = (map.h / -2) + 1;

            // repeat
            setTimeout(gameLoop, interval);
        };
        app.block.child('intro').css('display', 'none').sibling('overlays').css('display', 'table');
        Block.queries();
        gameLoop();
    },
    util: {
        dist: function (x1, y1, x2, y2) {
            var a = x1 - x2;
            var b = y1 - y2;
            return app.util.pythag(a, b);
        },
        pythag: function (a, b) {
            var c = Math.sqrt(a * a + b * b);
            return c;
        }
    },
    values: {
        speed: 1,
        alive: true,
        drawColliders: false
    },
    objects: {
        mouse: {
            x: 0,
            y: 0
        },
        player: {
            h: 50,
            w: 50,
            x: 0,
            y: 0,
            v: {
                m: 0,
                d: 0,
                b: false
            },
            i: false,
            n: ''
        },
        map: {
            h: 50,
            w: 50
        },
        server: {
            // server will continuously put map data here
            backup: { }
        }
    },
    defaults: {
        // server will initially put default data here
    }
};

window.addEventListener('load', function () {
    // setTimeout(function () {
        app.block.load(function () {
            app.block.fill(document.body);
            setTimeout(function () {
                app.block.css('opacity', '1');
            }, 50);
            Block.queries();
            setTimeout(function () { Block.queries(); }, 500);
            // if (app.mobile() || app.mobileAndTablet()) {
            //     Block.queries('off');
            //     $(window).on('orientationchange',function () {
            //         setTimeout(function () { Block.queries(); }, 250);
            //         setTimeout(function () { Block.queries(); }, 500);
            //         Block.queries();
            //     });
            // }
            app.connect();
            // app.pocket.send('login', 'anuv');
        }, 'app', 'jQuery');
    // }, 1000);
});

console.clear();
