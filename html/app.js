var app = {
    id: 0,
    block: Block('div', 'app'),
    pocket: Pocket(),
    server: {
        url: document.domain,
        script: 'rubbr.php',
        port: (document.domain.includes('rubbr.anuv.me') || document.domain.includes('rubbr.ml') ? 8006 : 30000)
    },
    connect: function () {
        var pocket = app.pocket;
        pocket.onClose(function () {
            app.values.alive = false;
            app.block.child('overlays').css('display', 'none')
                .sibling('dead').css('display', 'table').on('msg', {
                    msg: 'you were kicked<br/>(or the server crashed)'
                })
                .sibling('intro').on('msg', {
                    msg: 'disconnected'
                }).css('display', 'none');
        });
        pocket.bind('init', function (id, name, color, defaults) {
            if (id == false && name == false && color == false && defaults == false) {
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
                    app.objects.player.n = name;
                    app.objects.player.c = color;
                    app.values.alive = true;
                } catch (e) {
                    console.log('Failure to parse defaults JSON data');
                    console.log(e);
                    return false;
                }
                app.startGame(defaults['gameInterval']);
                app.startSync(defaults['syncInterval']);
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
                app.objects.player['c'] = map['users'][app.id]['c'];
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
            console.log('dead');
            app.values.alive = false;
            app.block.child('overlays').css('display', 'none')
                .sibling('dead').css('display', 'table').on('msg', {
                    msg: 'you ran out of health'
                });
        });
        pocket.bind('rejoin', function () {
            app.values.alive = true;
            app.block.child('intro').css('display', 'none').sibling('dead').css('display', 'none').sibling('overlays').css('display', 'table');
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
        gameLoop = function () {
            if (app.pocket.online() && app.values.alive) {
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
                canvas2d.drawImage(app.img.bg.$, 0 - player.x - (map.w / 2), 0 - player.y - (map.h / 2));
                canvas2d.restore();
                canvas2d.save();

                // draw money
                for (var m in server.money) {
                    var bill = server.money[m];
                    canvas2d.drawImage(app.img.dollar.$, bill['x'] - player.x - (defaults['money']['w'] / 2), bill['y'] - player.y - (defaults['money']['h'] / 2));
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
                    canvas2d.drawImage(app.img.gate.$, gate['x'] - player.x - (defaults['gates']['w'] / 2), gate['y'] - player.y - (defaults['gates']['h'] / 2));
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
                    canvas2d.drawImage(app.img.health.$, life['x'] - player.x - (defaults['lives']['w'] / 2), life['y'] - player.y - (defaults['lives']['h'] / 2));
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
                // canvas2d.fillStyle = '#6caf46';
                // canvas2d.fillRect(0 - player.w / 2, 0 - player.h / 2, player.w, player.h);
                var color = app.objects.player.c;
                canvas2d.drawImage(app.img.car[color].$, 0 - player.w / 2, 0 - player.h / 2, player.w, player.h);
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
                        // canvas2d.fillStyle = '#6caf46';
                        var plrDflts = app.defaults['player'];
                        var color = user['c'];
                        canvas2d.drawImage(app.img.car[color].$, 0 - player.w / 2, 0 - player.h / 2, player.w, player.h);
                        // canvas2d.fillRect(0 - plrDflts['w'] / 2, 0 - plrDflts['h'] / 2, plrDflts['w'], plrDflts['h']);
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
                var dx = player.v.m * Math.sin(player.v.d) / -10;
                var dy = player.v.m * Math.cos(player.v.d) / 10;
                player.x += dx;
                player.y += dy;

                // client-side player boundary colliders
                if (player.x >= map.w / 2) player.x = (map.w / 2) - 1;
                else if (player.x <= map.w / -2) player.x = (map.w / -2) + 1;
                if (player.y >= map.h / 2) player.y = (map.h / 2) - 1;
                else if (player.y <= map.h / -2) player.y = (map.h / -2) + 1;
            }
            // repeat
            setTimeout(gameLoop, interval);
        };
        app.block.child('intro').css('display', 'none').sibling('dead').css('display', 'none').sibling('overlays').css('display', 'table');
        Block.queries();
        gameLoop();
    },
    loadImages: function (callback) {
        var check = function () {
            for (var name in app.img) {
                if (name == 'car') {
                    for (var color in app.img.car) {
                        if (!app.img.car[color].loaded) return false;
                    }
                } else {
                    if (!app.img[name].loaded) return false;
                }
            }
            return true;
        };
        app.img.bg.$ = new Image();
        app.img.bg.$.onload = function () {
            app.img.bg.loaded = true;
            if (check()) callback();
        };
        app.img.bg.$.src = 'img/background-6.png';

        app.img.dollar.$ = new Image();
        app.img.dollar.$.onload = function () {
            app.img.dollar.loaded = true;
            if (check()) callback();
        };
        app.img.dollar.$.src = 'img/dollar.png';

        app.img.gate.$ = new Image();
        app.img.gate.$.onload = function () {
            app.img.gate.loaded = true;
            if (check()) callback();
        };
        app.img.gate.$.src = 'img/gate.png';

        app.img.health.$ = new Image();
        app.img.health.$.onload = function () {
            app.img.health.loaded = true;
            if (check()) callback();
        };
        app.img.health.$.src = 'img/health.png';

        var carLoadHandler = function (color) {
            return function () {
                app.img.car[color].loaded = true;
                if (check()) callback();
            };
        };
        for (var color in app.img.car) {
            app.img.car[color].$ = new Image();
            app.img.car[color].$.onload = carLoadHandler(color);
            app.img.car[color].$.src = 'img/cars/' + color + '.png'
        }
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
        },
        mobile: function () {
            var check = false;
            (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
            return check;
        }, // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
        mobileAndTablet: function() {
            var check = false;
            (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
            return check;
        }, // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
        cookie: function (id, val, date) {
            if (Block.is.unset(val))
                document.cookie.split('; ').forEach(function (cookie) {
                    if (cookie.substring(0, id.length) == id)
                        val = cookie.substring(id.length + 1);
                });
            else document.cookie = id + '=' + val + (Block.is.set(date) ? '; expires=' + date : '');
            return (Block.is.unset(val) ? null : val);
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
            n: '',
            c: ''
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
    },
    img: {
        bg: { $: null, loaded: false },
        dollar: { $: null, loaded: false },
        gate: { $: null, loaded: false },
        health: { $: null, loaded: false },
        car: {
            red: { $: null, loaded: false },
            green: { $: null, loaded: false },
            yellow: { $: null, loaded: false },
            orange: { $: null, loaded: false },
            purple: { $: null, loaded: false },
            blue: { $: null, loaded: false },
            white: { $: null, loaded: false },
            black: { $: null, loaded: false }
        }
    }
};

window.addEventListener('load', function () {
    console.log('loading');
    setTimeout(function () {
        app.block.load(function () {
            console.log('blocks loaded');
            app.loadImages(function () {
                console.log('images loaded');
                app.block.fill(document.body);
                setTimeout(function () {
                    app.block.css('opacity', '1');
                }, 50);
                Block.queries();
                setTimeout(function () { Block.queries(); }, 500);
                if (app.util.mobile() || app.util.mobileAndTablet()) {
                    Block.queries('off');
                    $(window).on('orientationchange',function () {
                        setTimeout(function () { Block.queries(); }, 250);
                        setTimeout(function () { Block.queries(); }, 500);
                        Block.queries();
                    });
                }
                console.log('connecting to pocket');
                app.connect();
            });
        }, 'app', 'jQuery');
    }, 1000);
});

console.clear();
