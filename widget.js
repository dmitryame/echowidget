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
		
		list.css({width:opts.width, height:opts.height - 40 - 50});
		root.css({width:opts.width, height:opts.height});
		
		this.OPTS = opts;
		this.root = root;
		this.list = list;
		this.status = root.find('.ewConvoStatus');
		
		this.clear();
	  },
	
	  postLoad: function() {
		Chat.init(ECHOWAVES_OPTS);
		Chat.clear();
		Chat.testMessage('Loading...');

		Chat.connectTo(ECHOWAVES_OPTS.channel);	
	  },
	
	  clear: function() {
	    this.list.html('');
	  },
	  
	  testMessage: function(content) {
		this.message({name: "", url: ""}, content);
	  },

	  message: function(user, content) {
	    var el = "<div class=\"ewMessage\">";
	    var avatar = user.gravatar_url ? "<a href=\"" + user.url + "\"><img alt=\"" + user.login + "\" src=\"" + user.gravatar_url + "\"/></a>" : '';
	    el += "<div class=\"ewAvatar\">" + avatar + "</div><div class=\"ewMessageText\">" + decodeURI(content) + "</div><div class=\"ewClear\"></div></div>";
	    this.list.append(el);
	  },
	
	  connectTo: function(CONV_ID) {
	    // FIXME: workaround for safari never ending loading issue
	    var orig_chooseTransport = Orbited.util.chooseTransport; 
	    Orbited.util.chooseTransport = function() { 
	      return Orbited.CometTransports.LongPoll;
	    }
	    this.testMessage('Connecting...', '');

	    // set up stomp client.
	    stomp = new STOMPClient();
	    stomp.onopen = function() {
		  Chat.status.attr('class', 'ewConvoStatus ewStatAttempt');
	    };
	    stomp.onclose = function(code) {
		  Chat.status.attr('class', 'ewConvoStatus ewStatOffline');
	    };
	    stomp.onerror = function(error) {
		  Chat.status.attr('class', 'ewConvoStatus ewStatError');
	    };
	    stomp.onerrorframe = function(frame) {
		  Chat.status.attr('class', 'ewConvoStatus ewStatError');
	    };
	    stomp.onconnectedframe = function() {
		  Chat.status.attr('class', 'ewConvoStatus ewStatOnline');
	      stomp.subscribe('CONVERSATION_CHANNEL_' + CONV_ID, {exchange:''});
	    };
	    stomp.onmessageframe = function(frame) {
	      var json = eval('(' + frame.body + ')');
	      // this is an actual message for current conversation
	      if(frame.headers['destination'].indexOf("CONVERSATION_CHANNEL_") == 0) {
	        Chat.message(json.user, json.message.body);
	      }
	      // this is a notify conversation message
	      if(frame.headers['destination'].indexOf("CONVERSATION_NOTIFY_CHANNEL_") == 0) {
	        Chat.message(json.user, json.message.body);
	      }
	    };
	    stomp.connect('localhost', 61613, 'user_', '');
	  }
	};
	

	// Orbited, STOMP
	$.getScript("http://orbited.echowaves.com:80/static/Orbited.js", function() {
		//setTimeout(function(evt) { 
		  	document.domain = 'www.echowaves.com';
			Orbited.settings.port = 80;
			Orbited.settings.hostname = 'orbited.echowaves.com';
			TCPSocket = Orbited.TCPSocket;

			$.getScript("http://orbited.echowaves.com:80/static/protocols/stomp/stomp.js", function() {
			  Chat.postLoad();
			});
		//}, 1);
	});

})();
