// A simple realtime editor app in Node.js

var QUEUE_ADDRESS = 'amqp://localhost',
    QUEUE_NAME = 'runpy',
    QUEUE_OPTIONS = {
        durable: false,
        noAck: true,
        autoDelete: true,
        exclusive: false
    };

var express = require('express'),
    http = require('http'),
    path = require('path'),
    uuid = require('node-uuid'),
    q = require('amqplib');

var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.static(path.join(__dirname, 'public')));

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port'));
});

var currentState = {
    input: '',
    output: ''
};

var io = require('socket.io')(server);
io.sockets.on('connection', function(socket) {
    socket.broadcast.emit('newUser');
    socket.emit('editorUpdate', currentState)

    socket.on('editorUpdate', function(data) {
        currentState = data;
        socket.broadcast.emit('editorUpdate', currentState);
    });

    socket.on('runCode', function(data) {
        currentState.input = data.input;

        var correlation = uuid.v4();
        var conn = q.connect(QUEUE_ADDRESS);
        conn.then(function(conn) {
            var ok = conn.createChannel();
            ok = ok.then(function(channel) {
                channel.assertQueue(QUEUE_NAME, QUEUE_OPTIONS);
                channel.sendToQueue(QUEUE_NAME,
                    new Buffer(
                        JSON.stringify({
                            input: currentState.input,
                            correlation_id: correlation
                        })
                    )
                );

                channel.assertQueue(correlation, QUEUE_OPTIONS);
                channel.consume(correlation, function(msg) {
                    var data = JSON.parse(msg.content);
                    currentState.output = data.output;
                    socket.emit('editorUpdate', currentState);
                    socket.broadcast.emit('editorUpdate', currentState);
                    conn.close();
                });
            });
        });
    });
});
