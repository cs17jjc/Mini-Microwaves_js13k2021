//?CANVAS
var dspCont1Style = window.getComputedStyle(document.getElementById("c1"));
var dspCont2 = document.getElementById("c2");

var dspCanv = document.getElementById("canvas");
var dspCtx = dspCanv.getContext("2d");
var dspCanvRect = dspCanv.getBoundingClientRect();

var rCanv = document.createElement("canvas");
rCanv.width = 960;
rCanv.height = 540;
var ctx = rCanv.getContext("2d");

rendCanv = () => {
    dspCtx.clearRect(0, 0, dspCanv.width, dspCanv.height);
    dspCtx.drawImage(rCanv, 0, 0, dspCanv.width, dspCanv.height);
}

var haltAnim = true;
onResize = () => {
    var w = parseInt(dspCont1Style.getPropertyValue("width")) * 0.98;
    var h = Math.floor(parseInt(dspCont1Style.getPropertyValue("height")) * 0.98);

    var outW = 0;
    var outH = 0;
    if (h < w * 0.5625) {
        outW = Math.floor(h * 1.7777);
        outH = h;
    } else {
        outW = w;
        outH = Math.floor(w * 0.5625);
    }

    dspCont2.style.width = outW + "px";
    dspCont2.style.height = outH + "px";
    dspCanv.width = outW;
    dspCanv.height = outH;
    dspCanvRect = dspCanv.getBoundingClientRect();

    if (haltAnim) {
        haltAnim = false;
        document.body.classList.add("no-anim");
        setTimeout(() => {
            document.body.classList.remove("no-anim");
            haltAnim = true;
        }, 200);
    }
    rendCanv();
};

window.onload = () => { onResize(); };

//?OBJECTS
defObejct = (type, x, y, data) => { return { type, x, y, data }; }

emitter = (x, y, dir) => { return defObejct("emitter", x, y, { dir }); }

attractor = (x, y) => { return defObejct("attractor", x, y, { r: 10, m: 100 }); }

cloud = (x, y, r) => { return defObejct("cloud", x, y, { r }); }

reciver = (x, y) => { return defObejct("reciver", x, y, { r: 10 }); }

//is point in rectangle
isPinR = (obj, rect) => {
    return (obj.x >= rect.x && obj.x <= rect.x + rect.w && obj.y >= rect.y && obj.y <= rect.y + rect.h);
}

//euclid dist
dist = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

//normalise
norm = (p) => {
    var mag = Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2));
    return { x: p.x / mag, y: p.y / mag };
};

angleBetw = (p1, p2) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

mag = (p) => { return Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2)); }

lerp = (a, b, t) => { return a + (b - a) * t; }


//?QUADTREE
qTree = (w, h, objects) => {

    var defQuad = (x, y, w, h) => {
        return {
            x: x,
            y: y,
            w: w,
            h: h,
            topLeft: null,
            topRight: null,
            bottomLeft: null,
            bottomRight: null,
            objects: []
        };
    }

    var root = defQuad(0, 0, w, h);

    var insert = (quad, obj) => {
        if (isPinR(obj, quad)) {
            if (quad.objects.length < 5) {
                quad.objects.push(obj);
            } else {
                if (quad.topLeft == null) {
                    quad.topLeft = defQuad(quad.x, quad.y, quad.w / 2, quad.h / 2);
                    quad.topRight = defQuad(quad.x + quad.w / 2, quad.y, quad.w / 2, quad.h / 2);
                    quad.bottomLeft = defQuad(quad.x, quad.y + quad.h / 2, quad.w / 2, quad.h / 2);
                    quad.bottomRight = defQuad(quad.x + quad.w / 2, quad.y + quad.h / 2, quad.w / 2, quad.h / 2);
                }
                insert(quad.topLeft, obj);
                insert(quad.topRight, obj);
                insert(quad.bottomLeft, obj);
                insert(quad.bottomRight, obj);
            }
        }
    }

    objects.forEach(obj => {
        //Insert into quadtree
        insert(root, obj);
    });

    return root;
}

queryTree = (tree, rect) => {
    if (tree.x <= rect.x + rect.w && tree.x + tree.w >= rect.x && tree.y <= rect.y + rect.h && tree.y + tree.h >= rect.y) {
        var ret = tree.objects.filter(o => isPinR(o, rect));
        if (tree.topLeft != null) {
            ret = ret.concat(queryTree(tree.topLeft, rect));
            ret = ret.concat(queryTree(tree.topRight, rect));
            ret = ret.concat(queryTree(tree.bottomLeft, rect));
            ret = ret.concat(queryTree(tree.bottomRight, rect));
        }
        return ret;
    }
    return [];
}

var mPos = { x: 0, y: 0 };
var prevMPos = { x: 0, y: 0 };
window.onmousemove = (e) => {
    mPos = {
        x: (e.clientX - dspCanvRect.left) / (dspCanvRect.right - dspCanvRect.left) * rCanv.width,
        y: (e.clientY - dspCanvRect.top) / (dspCanvRect.bottom - dspCanvRect.top) * rCanv.height
    };
}
var click = false;
var prevClick = false;
window.onmousedown = (e) => {
    click = true;
}
window.onmouseup = (e) => {
    click = false;
}

var mKeys = new Map();
var mKeysPrev = new Map();
window.onkeydown = (e) => {
    mKeys.set(e.key.toLowerCase(), true);
}
window.onkeyup = (e) => {
    mKeys.set(e.key.toLowerCase(), false);
}

//?CONSTANTS
const PHOTON_MASS = 0.1; //Yeah I know this sounds odd 
const MAP_WIDTH = 960;
const MAP_HEIGHT = 540;

//?GAMEDATA
var emitters = [];
emitters.push(emitter(400, 400, 0));

var attractors = [];
attractors.push(attractor(500, 300));
attractors.push(attractor(700, 400));

var clouds = [];
clouds.push(cloud(300, 200, 25));
clouds.push(cloud(700, 500, 25));

var recivers = [];
recivers.push(reciver(600, 200));

var rays = [];

var quadTree;

var isRotating = false;
var isMoving = false;

var rotatingEmitter = null;
var movingAttractor = null;

var target = { x: 0, y: 0 };

//?UPDATE
update = () => {
    mKeysPrev = new Map(mKeys);
    prevMPos = mPos;
    prevClick = click;

    if (isRotating) {
        if (mKeys.get('shift')) {
            var s = 0.05;
            var deltaPos = { x: (mPos.x - target.x) * s, y: (mPos.y - target.y) * s };
            rotatingEmitter.data.dir = angleBetw(rotatingEmitter, { x: target.x + deltaPos.x, y: target.y + deltaPos.y });

        } else {
            target = mPos;
            rotatingEmitter.data.dir = angleBetw(rotatingEmitter, target);
        }
    }

    quadTree = qTree(MAP_WIDTH, MAP_HEIGHT, attractors.concat(clouds).concat(recivers));
    rays = [];
    emitters.forEach(em => {
        var ray = { points: [{ x: em.x, y: em.y, steps: 0 }] }
        var hasHit = false;
        var a = em.data.dir;
        var vel = { x: Math.cos(a) * 2, y: Math.sin(a) * 2 };
        while (!hasHit && ray.points.length < 1000) {

            var p = ray.points[ray.points.length - 1];
            var maxSteps = Math.max(1, Math.floor(1 / mag(vel)));
            for (var steps = 0; steps < maxSteps; steps++) {
                var f = { x: 0, y: 0 };
                var near = queryTree(quadTree, { x: p.x - 100, y: p.y - 100, w: 200, h: 200 });

                near.forEach(o => {

                    switch (o.type) {
                        case 'attractor':
                            var d = dist(p, o);
                            var angle = angleBetw(p, o);
                            var force = 0.1 * ((o.data.m * PHOTON_MASS) / (d * d * (d * 0.01)));
                            f.x += force * Math.cos(angle);
                            f.y += force * Math.sin(angle);

                            if (d < o.data.r) {
                                hasHit = true;
                            }
                            break;
                        case 'cloud':
                            var d = dist(p, o);
                            if (d < o.data.r) {
                                hasHit = true;
                            }
                        case 'reciver':
                            var d = dist(p, o);
                            if (d < o.data.r) {
                                hasHit = true;
                            }
                            break;
                    }
                });

                if (p.x < 0 || p.x > MAP_WIDTH || p.y < 0 || p.y > MAP_HEIGHT) {
                    hasHit = true;
                }

                if (hasHit) {
                    break;
                }

                vel.x += f.x / PHOTON_MASS;
                vel.y += f.y / PHOTON_MASS;

                p = { x: p.x + vel.x, y: p.y + vel.y };

            }
            p.steps = maxSteps;
            ray.points.push(p);
        }
        rays.push(ray);
    });


}

//?RENDER

render = () => {
    //Clear canvas
    ctx.clearRect(0, 0, rCanv.width, rCanv.height);

    //Render rays
    ctx.strokeStyle = "#FFFFFF";
    rays.forEach(ray => {
        ctx.beginPath();
        ctx.moveTo(ray.points[0].x, ray.points[0].y);
        ray.points.slice(1).forEach(p => {
            ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    });

    //Render emitters
    emitters.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = "#FF0000";
        ctx.fill();
    });

    //Render attractors
    attractors.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#00FF00";
        ctx.fill();
    });

    //Render clouds
    clouds.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
    });

    //Render recivers
    recivers.forEach(obj => {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.data.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFAA00";
        ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(mPos.x, mPos.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#00FF00";
    ctx.fill();

}

//?LOOP
setInterval(() => {
    update();
    render();
    rendCanv();

}, 1000 / 60);