// dependencies
const express = require('express');
const WebSocket = require('ws');
const SocketServer = require('ws').Server;

const server = express().listen(3000);

const wss = new SocketServer({ server });

var ids = [];

wss.on('connection', (ws) => {

    console.log('[Server] A client was connected');
    
    ws.id = wss.getUniqueID();

    ids.push(ws.id);

    ws.on('close', () => {
        console.log('[Server] Client disconnected');

        var index = ids.indexOf(ws.id);
        console.log(ws.id);
        console.log(ids[0]);
        if (index === -1) console.log('[Server] Undefined ID!');
        else ids.splice(index, 1);        

        // broadcast to everyone else
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    method: 'disconnect',
                    params: {
                        id: ids.indexOf(ws.id)
                    }
                }));
                
            }
        });

    });

    ws.on('message', (message) => {
        try {
            let m = JSON.parse(message);
            handleMessage(m, ws);
        } catch (err) {
            console.log('[Server] Message isn\'t parsable');
            console.log(message);
        }

    });
});

wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    var r = s4() + s4() + '-' + s4();
    return r;
};

// handlers

let handlers = {
    "message": function (m) {

        console.log('[Server] Received message: %s', m.params.message);

        var t = "plain";
        if (m.params.message.toLowerCase().includes("fontos")) t = "bold";

        // broadcast to everyone else
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    method: 'message',
                    params: {
                        message: m.params.message,
                        type: t
                    }
                }));
            }
        });
    },
    "draw": function (m) {
        wss.clients.forEach(function each(client) {
            client.send(JSON.stringify({
                method: 'draw',
                params: {
                    x1: m.params.x1,
                    y1: m.params.y1,
                    x2: m.params.x2,
                    y2: m.params.y2,
                    color: m.params.color
                }
            }));
        });
    },
    "player": function (m, ws) {
        wss.clients.forEach(function each(client) {
            m.params.index = ids.indexOf(ws.id);
            if (client.id != ws.id) {
                client.send(JSON.stringify(m));
            }
        });
    }
};

function handleMessage(m, ws) {

    if (m.method == undefined) {
        return;
    }

    let method = m.method;

    if (method) {

        if (handlers[method]) {
            let handler = handlers[method];
            //console.log(handler);
            handler(m, ws);
        } else {
            console.log('[Client] No handler defined for method ' + method + '.');
        }

    }

}