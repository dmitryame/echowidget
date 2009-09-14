// jQuery
if (typeof jQuery == 'undefined') {
    document.write('<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js" type="text/javascript"></script>');
}

// Core
 (function() {
    var Chat = {
        init: function(opts) {
            // just set div sizes according to config
            var root = $('#ewContainer');
            var list = root.children('.ewMessageList');
            var title = root.find('.ewConvoName');

            list.css({
                width: opts.width,
                height: opts.height - 40 - 50
            });
            root.css({
                width: opts.width,
                height: opts.height
            });

            this.OPTS = opts;
            this.root = root;
            this.list = list;
            this.lastScroll = 0;
            this.status = root.find('.ewConvoStatus');
            this.readonly = true;
            this.auth = false;
            this.connected = false;

            this.clear();
            this.setAuth(false);

            // Load coversation details
            $.get("http://www.echowaves.com/conversations/" + opts.channel + ".xml", {},
            function(xml) {
                var convo = $('conversation', xml);

                Chat.name = convo.children('name').text();
                Chat.UUID = convo.children('uuid').text();
                Chat.readonly = convo.children('uuid').text() != 'false';

                title.html(Chat.name);

                // Reset message list scroll
                var dList = Chat.list[0];
                dList.scrollTop = 0;

                // Post-load connection logic
                Chat.postLoad();
            });
        },

        postLoad: function() {
            Chat.connectTo(ECHOWAVES_OPTS.channel);

            // Setup the form
            var theForm = this.root.find('.ewMessageEntry form');

            theForm.unbind();
            theForm.submit(function(evt) {
	            var textbox = $(evt.target).find('textarea');
	            if ($.trim(textbox.attr('value')).length == 0) {
	               return false;
	            }
	            
                // Post message, damnit!
                $.post("http://www.echowaves.com/conversations/" + ECHOWAVES_OPTS.channel + "/messages",
                      {'message[message]':textbox.attr('value')}, null, 'xml');

                // reset message box
                Chat.ClearTextbox(textbox);

                return false;
            });

            var theBox = theForm.find('textarea');
            theBox.unbind();
            theBox.keyup(function(evt) {
	            if (evt.which == 13 && !evt.shiftKey)
                  theForm.submit();
                else
                  Chat.FitTextbox($(evt.target), 100);
            });
            this.ClearTextbox(theBox);

            Chat.readonly = false;
            Chat.setAuth(true);
            // TODO: figure out if we are logged in
        },

        ClearTextbox: function(el)
        {
            el.attr('value', '');
            el.css('height', "24px");
        },

        FitTextbox: function(el, maxHeight)
        {
            var text = el[0];
            var adjustedHeight = text.clientHeight;
            if (!maxHeight || maxHeight > adjustedHeight)
            {
                adjustedHeight = Math.max(text.scrollHeight, adjustedHeight);
                if (maxHeight)
                    adjustedHeight = Math.min(maxHeight, adjustedHeight);
                if (adjustedHeight > text.clientHeight) {
                    el.css('height', adjustedHeight + "px");
                }
            }
        },

        clear: function() {
            this.list.html('');
        },

        testMessage: function(content) {
            this.message({
                name: "",
                url: ""
            },
            content);
        },

        setAuth: function(value) {
            if (value && !this.readonly && this.connected) {
                // Make sure form is visible
                this.root.find('.ewMessageEntry').show();
                this.root.find('.ewMessageReadonly').hide();
            } else {
                // Set connection status message
                var statusStr = "";
                if (!this.connected) {
                    statusStr = "<p>You are not connected.</p>";
                } else if (!this.readonly) {
                    statusStr = "<p>Readonly conversation.</p>";
                } else if (!this.auth) {
                    statusStr = "<p>You are not logged in. <a href=\"http://www.echowaves.com/\">Login here</a>.</p>";
                }
                // Make sure "please login" / "read only" is visible
                this.root.find('.ewMessageEntry').hide();
                this.root.find('.ewMessageReadonly').html(statusStr).show();
            }

            this.auth = value;
        },

        onConnected: function() {
	      this.connected = true;
	      this.setAuth(this.auth);
        },

        onDisconnected: function() {
	      this.connected = false;
	      this.setAuth(this.auth);
        },

        message: function(user, content) {
            // First, see if we have scrolled in the list
            var dList = this.list[0];
            var didScroll = (dList.scrollTop == this.lastScroll) || (dList.scrollHeight - dList.style.height - dList.scrollTop < 4) ? false: true;

            // Add message content
            var el = "<div class=\"ewMessage\">";
            var avatar = user.gravatar_url ? "<a href=\"" + user.url + "\"><img alt=\"" + user.login + "\" src=\"" + user.gravatar_url + "\"/></a>": '';
            el += "<div class=\"ewAvatar\">" + avatar + "</div><div class=\"ewMessageText\">" + decodeURI(content) + "</div><div class=\"ewClear\"></div></div>";
            this.list.append(el);

            // Scroll to bottom
            if (!didScroll) {
                dList.scrollTop = dList.scrollHeight;
                this.lastScroll = dList.scrollTop;
            }
        },

        connectTo: function(CONV_ID) {
            // FIXME: workaround for safari never ending loading issue
            var orig_chooseTransport = Orbited.util.chooseTransport;
            Orbited.util.chooseTransport = function() {
                if ($.browser.safari)
                    return Orbited.CometTransports.LongPoll;
                else
                    return orig_chooseTransport();
            }
            this.testMessage('Connecting...', '');
            var didConnect = false;

            // set up stomp client.
            stomp = new STOMPClient();
            stomp.onopen = function() {
                Chat.status.attr('class', 'ewConvoStatus ewStatAttempt');
            };
            stomp.onclose = function(code) {
                Chat.status.attr('class', 'ewConvoStatus ewStatOffline');
                Chat.onDisconnected();
            };
            stomp.onerror = function(error) {
                Chat.status.attr('class', 'ewConvoStatus ewStatError');
            };
            stomp.onerrorframe = function(frame) {
                Chat.status.attr('class', 'ewConvoStatus ewStatError');
            };
            stomp.onconnectedframe = function() {
                if (!didConnect) {
                    didConnect = true;
                    Chat.clear();
                    Chat.testMessage('Connected to "' + Chat.name + '", chat away!', '');
                } else {
                    Chat.testMessage('Reconnected', '');
                }
                Chat.onConnected();
                Chat.status.attr('class', 'ewConvoStatus ewStatOnline');
                stomp.subscribe('CONVERSATION_CHANNEL_' + CONV_ID, {
                    exchange: ''
                });
            };
            stomp.onmessageframe = function(frame) {
                var json = eval('(' + frame.body + ')');
                // this is an actual message for current conversation
                if (frame.headers['destination'].indexOf("CONVERSATION_CHANNEL_") == 0) {
                    Chat.message(json.user, json.message.body);
                }
                // this is a notify conversation message
                if (frame.headers['destination'].indexOf("CONVERSATION_NOTIFY_CHANNEL_") == 0) {
                    //Chat.message(json.user, json.message.body);
                }
            };
            stomp.connect('localhost', 61613, 'user_', '');
        }
    };


    // Orbited, STOMP
    $.getScript("http://orbited.echowaves.com:80/static/Orbited.js",
    function() {
        //setTimeout(function(evt) {
        document.domain = 'www.echowaves.com';
        Orbited.settings.port = 80;
        Orbited.settings.hostname = 'orbited.echowaves.com';
        TCPSocket = Orbited.TCPSocket;

        $.getScript("http://orbited.echowaves.com:80/static/protocols/stomp/stomp.js",
        function() {
            Chat.init(ECHOWAVES_OPTS);
        });
        //}, 1);
    });

})();
