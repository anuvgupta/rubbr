<?php
include('pocket.php');

$ip = $argv[2];
$port = $argv[3];
$pocket = new Pocket($ip, $port, 20, 50);
$pocket->setOpt('kick-bad-events', false);

$users = [];
$money = [];
$gates = [];
$lives = [];
$killqueue = [];
$rankings = [
    'last' => 0,
    'users' => []
];
$defaults = [
    'gameInterval' => 10,
    'syncInterval' => 20,
    'speed' => 0.65,
    'map' => [
        'h' => 3000,
        'w' => 3000
    ],
    'player' => [
        'h' => 90,
        'w' => 60,
        'x' => 0,
        'y' => 0,
        'money' => 0,
        'radius' => 35,
        'kills' => 0,
        'health' => 100
    ],
    'boost' => [
        'time' => 700,
        'speed' => 1.3,
        'cost' => 20
    ],
    'collisions' => [
        'bounceFactor' => 1.5,
        'healthLost' => 25,
        'invulnerableTime' => 4000
    ],
    'health' => [
        'rate' => [
            'amount' => 1,
            'time' => 1000
        ]
    ],
    'rankings' => [
        'refreshTime' => 2000
    ],
    'money' => [
        'h' => 25,
        'w' => 50,
        'total' => 150,
        'radius' => 18,
        'border' => 30
    ],
    'gates' => [
        'total' => 5,
        'boost' => [
            'time' => 500,
            'speed' => 1.5,
            'cost' => 0
        ],
        'radius' => 95,
        'h' => 220,
        'w' => 220,
        'border' => 200
    ],
    'lives' => [
        'h' => 50,
        'w' => 50,
        'radius' => 25,
        'value' => 20,
        'total' => 10,
        'border' => 30
    ]
];

function summarizeMap() {
    global $users, $money, $gates, $lives;
    $summary = [
        'users' => [],
        'money' => [],
        'gates' => [],
        'lives' => []
    ];
    foreach ($users as $u => $user) {
        $summary['users'][$u] = [
            'x' => $user['x'],
            'y' => $user['y'],
            'v' => [
                'm' => $user['v']['m'],
                'd' => $user['v']['d']
            ],
            'i' => $user['invulnerable'],
            'n' => $user['name']
        ];
    }
    foreach ($money as $m => $bill) {
        $summary['money'][$m] = [
            'x' => $bill['x'],
            'y' => $bill['y']
        ];
    }
    foreach ($gates as $g => $gate) {
        $summary['gates'][$g] = [
            'x' => $gate['x'],
            'y' => $gate['y']
        ];
    }
    foreach ($lives as $l => $life) {
        $summary['lives'][$l] = [
            'x' => $life['x'],
            'y' => $life['y']
        ];
    }
    return $summary;
}

function randCoords($offset = 5) {
    global $defaults;
    return [
        'x' => rand(-1 * $defaults['map']['w'] / 2 + $offset, $defaults['map']['w'] / 2 - $offset),
        'y' => rand(-1 * $defaults['map']['h'] / 2 + $offset, $defaults['map']['h'] / 2 - $offset)
    ];
}

function circularCollision($r0, $r1, $x0, $y0, $x1, $y1) {
    $d2 = pow($x0 - $x1, 2) + pow($y0 - $y1, 2);
    if (pow($r0 - $r1, 2) <= $d2 && $d2 <= pow($r0 + $r1, 2))
        return true;
    return false;
    // Formula: (R0-R1)^2 <= (x0-x1)^2+(y0-y1)^2 <= (R0+R1)^2
    // Source: https://stackoverflow.com/questions/8367512/algorithm-to-detect-if-a-circles-intersect-with-any-other-circle-in-the-same-pla
}

function rectangularCollision($w1, $h1, $x1, $y1, $w2, $h2, $x2, $y2) {
    if ($x1 < $x2 + $w2 && $x1 + $w1 > $x2 && $y1 < $y2 + $h2 && $h1 + $y1 > $y2)
        return true;
    return false;
   // Source: https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
}

function rank($a, $b) {
    if ($a['kills'] > $b['kills']) return 1;
    else if ($a['kills'] < $b['kills']) return -1;
    else {
        if ($a['money'] > $b['money']) return 1;
        else if ($a['money'] < $b['money']) return -1;
        else return 0;
    }
}

function randID($length = 10) {
    $key = '';
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for ($i = 0; $i < $length; $i++)
        $key .= $chars[rand(0, strlen($chars) - 1)];
    return $key;
}

$pocket->onConn(function ($id) use (&$pocket) {
    $pocket->log("user[$id] connected");
});
$pocket->onClose(function ($id) use (&$pocket, &$users, &$killqueue) {
    $pocket->log("user[$id] disconnected");
    if (isset($users[$id])) {
        array_push($killqueue, [
            'id' => $id,
            'key' => $users[$id]['key'],
            'disconnected' => true
        ]);
    }
});
$pocket->onRun(function () use (&$pocket, &$users, &$money, &$rankings, &$gates, &$lives, &$killqueue, $defaults) {
    // echo "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
    // print_r($users);
    // echo "\n";
    // print_r($killqueue);

    // send each player a map summary
    $mapSummary = summarizeMap();
    foreach ($users as $u => $user) {
        $pocket->send('map', $u, json_encode($mapSummary));
    }

    // calculate and send player data
    foreach ($users as $u => $user) {
        // monitor user health
        if ($user['health'] <= 0) {
            $users[$u]['health'] = 0;
            array_push($killqueue, [
                'id' => $u,
                'key' => $users[$u]['key'],
                'disconnected' => false
            ]);
            continue;
        }
        // calculate position based on passed time and speed and send
        $time = microtime(true) * 1000;
        if ($user['v']['lastTimestamp'] == 0) {
            $users[$u]['x'] = 0;
            $users[$u]['y'] = 0;
        } else {
            $magnitude = $user['v']['m'];
            if ($user['v']['boost']['$']) { // apply boost
                if ($user['v']['boost']['type'] == 'gate') {
                    if ($time - $user['v']['boost']['time'] >= $defaults['gates']['boost']['time']) {
                        $users[$u]['v']['boost']['$'] = false;
                        $pocket->send('boost', $u, 2);
                    } else $magnitude = 100 * $defaults['gates']['boost']['speed'];
                } else if ($user['v']['boost']['type'] == 'normal') {
                    if ($time - $user['v']['boost']['time'] >= $defaults['boost']['time']) {
                        $users[$u]['v']['boost']['$'] = false;
                        $pocket->send('boost', $u, 2);
                    } else $magnitude = 100 * $defaults['boost']['speed'];
                }
            }
            $passed = $time - $user['v']['lastTimestamp'];
            $dx = ($magnitude * sin($user['v']['d']) / -10) / $defaults['gameInterval'] * $passed;
            $dy = ($magnitude * cos($user['v']['d']) / 10) / $defaults['gameInterval'] * $passed;
            $users[$u]['x'] += $dx;
            $users[$u]['y'] += $dy;
            // apply wall colliders
            if ($user['x'] >= $defaults['map']['w'] / 2) $users[$u]['x'] = ($defaults['map']['w'] / 2) - 1;
            else if ($user['x'] <= $defaults['map']['w'] / -2) $users[$u]['x'] = ($defaults['map']['w'] / -2) + 1;
            if ($user['y'] >= $defaults['map']['h'] / 2) $users[$u]['y'] = ($defaults['map']['h'] / 2) - 1;
            else if ($user['y'] <= $defaults['map']['h'] / -2) $users[$u]['y'] = ($defaults['map']['h'] / -2) + 1;
        }
        $users[$u]['v']['lastTimestamp'] = $time;

        // collisions
        $playerW = $defaults['player']['w'];
        $playerH = $defaults['player']['h'];
        // calculate money collisions
        foreach ($money as $m => $bill) {
            if (circularCollision($defaults['player']['radius'], $defaults['money']['radius'], $user['x'], $user['y'], $bill['x'], $bill['y'])) {
            // if (rectangularCollision($playerW, $playerH, $user['x'] - $playerW / 2, $user['y'] - $playerH / 2, $defaults['money']['w'], $defaults['money']['h'], $bill['x'], $bill['y'])) {
                $money[$m] = randCoords($defaults['money']['border']);
                $users[$u]['money']++;
            }
        }
        // calculate gate collisions
        foreach ($gates as $g => $gate) {
            if (circularCollision($defaults['player']['radius'], $defaults['gates']['radius'], $user['x'], $user['y'], $gate['x'], $gate['y'])) {
                $users[$u]['v']['boost']['$'] = true;
                $users[$u]['v']['boost']['type'] = 'gate';
                $users[$u]['v']['boost']['time'] = microtime(true) * 1000;
                $users[$u]['money'] -= $defaults['gates']['boost']['cost'];
                $pocket->send('boost', $u, 4);
                break;
            }
        }
        // calculate life collisions
        foreach ($lives as $l => $life) {
            if (circularCollision($defaults['player']['radius'], $defaults['lives']['radius'], $user['x'], $user['y'], $life['x'], $life['y'])) {
                $lives[$l] = randCoords($defaults['lives']['border']);
                $users[$u]['health'] += $defaults['lives']['value'];
                if ($users[$u]['health'] > 100) $users[$u]['health'] = 100;
            }
        }
        // calculate user collisions
        foreach ($users as $u2 => $user2) {
            if ($u == $u2) continue; // can't collide with yourself
            if (circularCollision($defaults['player']['radius'], $defaults['player']['radius'], $user['x'], $user['y'], $user2['x'], $user2['y'])) {
            // if (rectangularCollision($playerW, $playerH, $user['x'] - $playerW / 2, $user['y'] - $playerH / 2, $playerW, $playerH, $user2['x'] - $playerW / 2, $user2['y'] - $playerH / 2)) {
                if ($user['v']['boost']['$'] && $user2['v']['boost']['$']) { // boost collision, both are boosting
                    $pocket->log("double boost collision between users *$u* and *$u2*");
                } else if ($user['v']['boost']['$'] && !$user2['v']['boost']['$']) { // boost collision, favors $user
                    if ($users[$u2]['invulnerable'] === false) {
                        $users[$u2]['health'] -= $defaults['collisions']['healthLost'];
                        $users[$u2]['invulnerable'] = microtime(true) * 1000;
                        if ($users[$u2]['health'] < 0) {
                            $users[$u2]['health'] = 0;
                            array_push($killqueue, [
                                'id' => $u2,
                                'key' => $users[$u2]['key'],
                                'disconnected' => false
                            ]);
                        }
                        if ($users[$u2]['health'] == 0) $users[$u]['kills'] += 2;
                        else $users[$u]['kills']++;
                        $pocket->log("single boost collision between users *$u* and $u2");
                    }
                } else if ($user2['v']['boost']['$'] && !$user['v']['boost']['$']) { // boost collision, favors $user2
                    if ($users[$u]['invulnerable'] === false) {
                        $users[$u]['health'] -= $defaults['collisions']['healthLost'];
                        $users[$u]['invulnerable'] = microtime(true) * 1000;
                        if ($users[$u]['health'] < 0) {
                            $users[$u]['health'] = 0;
                            array_push($killqueue, [
                                'id' => $u,
                                'key' => $users[$u]['key'],
                                'disconnected' => false
                            ]);
                        }
                        if ($users[$u]['health'] == 0) $users[$u2]['kills'] += 2;
                        else $users[$u2]['kills']++;
                        $pocket->log("single boost collision between users *$u2* and $u");
                    }
                } else { // regular collision, neither is boosting
                    $time = microtime(true) * 1000;
                    if ($user['v']['m'] > $user2['v']['m']) {
                        $f = $u; // the faster one is favored
                        $s = $u2; // the slower one is pushed
                    } else {
                        $f = $u2;
                        $s = $u;
                    }
                    $magnitude = $users[$f]['v']['m'];
                    $passed = $time - $users[$f]['v']['lastTimestamp'];
                    $dx = ($magnitude * sin($users[$f]['v']['d']) / -10) / $defaults['gameInterval'] * $passed;
                    $dy = ($magnitude * cos($users[$f]['v']['d']) / 10) / $defaults['gameInterval'] * $passed;
                    $users[$s]['x'] += $dx * $defaults['collisions']['bounceFactor'];
                    $users[$s]['y'] += $dy * $defaults['collisions']['bounceFactor'];
                    $pocket->log("regular collision between users *$f* and $s");
                }
            }
        }

        // calculate invulnerability
        if (!is_bool($user['invulnerable'])) {
            $time = microtime(true) * 1000;
            $passed = $time - $user['invulnerable'];
            if ($passed >= $defaults['collisions']['invulnerableTime'])
                $users[$u]['invulnerable'] = false;
        }

        // calculate health
        $time = microtime(true) * 1000;
        $users[$u]['health'] += (($time - $user['lastHealth']) / $defaults['health']['rate']['time']) * $defaults['health']['rate']['amount'];
        if ($users[$u]['health'] > 100) $users[$u]['health'] = 100;
        else if ($users[$u]['health'] < 0) $users[$u]['health'] = 0;
        $users[$u]['lastHealth'] = $time;

        // send all data to player
        $pocket->send('data', $u, $user['money'], $user['kills'], $user['health'], ($user['invulnerable'] === false ? false : true));
        $pocket->send('position', $u, $user['x'], $user['y']);
    }

    // rank players
    $time = microtime(true) * 1000;
    if ($time - $rankings['last'] >= $defaults['rankings']['refreshTime']) {
        $rankings['users'] = [];
        foreach ($users as $u => $user) {
            array_push($rankings['users'], [
                'id' => $u,
                'kills' => $user['kills'],
                'money' => $user['money'],
                'name' => $user['name']
            ]);
        }
        usort($rankings['users'], 'rank');
        foreach ($users as $u => $user) {
            $pocket->send('rankings', $u, json_encode($rankings['users']));
        }
        $rankings['last'] = $time;
    }

    // kill players
    foreach ($killqueue as $k => $deaduser) {
        if ($users[$deaduser['id']]['key'] == $deaduser['key']) {
            if (!$deaduser['disconnected'])
                $pocket->send('dead', $deaduser['id']);
            unset($users[$deaduser['id']]);
            unset($killqueue[$k]);
        }
    }
});

$pocket->bind('login', function ($username, $id) use (&$pocket, &$users, $defaults) {
    if (ctype_alnum($username)) {
        $users[$id] = [
            'id' => $id,
            'name' => $username,
            'key' => randID(),
            'x' => $defaults['player']['x'],
            'y' => $defaults['player']['y'],
            'money' => $defaults['player']['money'],
            'kills' => $defaults['player']['kills'],
            'health' => $defaults['player']['health'],
            'invulnerable' => false,
            'lastHealth' => microtime(true) * 1000,
            'v' => [
                'm' => 0,
                'd' => 0,
                'lastTimestamp' => 0,
                'boost' => [
                    '$' => false,
                    'time' => (microtime(true) * 1000),
                    'type' => 'none'
                ]
            ]
        ];
        $pocket->send('init', $id, $id, json_encode($defaults));
    } else $pocket->send('init', $id, false, false);
});
$pocket->bind('sync', function ($m, $d, $id) use (&$pocket, &$users) {
    if ($m > 100) $m = 100;
    $users[$id]['v']['m'] = $m;
    $users[$id]['v']['d'] = $d;
});
$pocket->bind('boost', function ($id) use (&$pocket, &$users, $defaults) {
    if (!$users[$id]['v']['boost']['$']) {
        if ($users[$id]['money'] < $defaults['boost']['cost']) {
            $pocket->send('boost', $id, 3);
        } else {
            $users[$id]['v']['boost']['$'] = true;
            $users[$id]['v']['boost']['type'] = 'normal';
            $users[$id]['v']['boost']['time'] = microtime(true) * 1000;
            $users[$id]['money'] -= $defaults['boost']['cost'];
            $pocket->send('boost', $id, 1);
        }
    } else $pocket->send('boost', $id, 0);
});

// populate map
for ($m = 0; $m < $defaults['money']['total']; $m++) {
    array_push($money, randCoords($defaults['money']['border']));
}
for ($g = 0; $g < $defaults['gates']['total']; $g++) {
    array_push($gates, randCoords($defaults['gates']['border']));
}
for ($l = 0; $l < $defaults['lives']['total']; $l++) {
    array_push($lives, randCoords($defaults['lives']['border']));
}

$pocket->open();
?>
