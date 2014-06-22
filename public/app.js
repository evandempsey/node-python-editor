(function() {
    var editor = ace.edit("editor");
    editor.setByAPI = false;
    editor.setFontSize(18);
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/python");
    editor.setShowPrintMargin(false);

    var output = ace.edit("output");
    output.setFontSize(18);
    output.setTheme("ace/theme/monokai");
    output.setShowPrintMargin(false);
    output.setReadOnly(true);

    var button = document.getElementById("button");

    var socket = io.connect();
    socket.on('newUser', function() {
        alert('A user has connected.');
    });

    socket.on('editorUpdate', function(data) {
        editor.setByAPI = true;
        editor.setValue(data.input);
        editor.clearSelection();
        editor.setByAPI = false;

        output.setValue(data.output);
        output.clearSelection();
    });

    $(function() {
        editor.on('change', function() {
            if (!editor.setByAPI) {
                socket.emit('editorUpdate', {
                    input: editor.getValue(),
                    output: output.getValue()
                });
            }
        });

        button.onclick = function() {
            socket.emit('runCode', {
                input: editor.getValue()
            })
        };

        var resize = function() {
            var editor = $("#editor");
            var output = $("#output");

            editor.css('right', (window.innerWidth / 2).toString() + 'px');
            output.css('left', (window.innerWidth / 2).toString() + 'px');
        };

        window.onresize = resize;
        resize();
    });
})();
