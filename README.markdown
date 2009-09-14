# EchoWidget

A widget for EchoWaves.com. Very early stages!

## Generating the code

To use the widget properly, you'll need to generate the "widget.js" file:

	rake gen

## Including it in your page

Simply post the following code anywhere on your page!

	<div id="ewContainer"></div>
	<script type="text/javascript">
		var ECHOWAVES_OPTS = {
			channel: 3,  // channel id to monitor + post
			width: 300,  // desired width of widget
			height: 300, // desired height of widget
		};
	</script>
	<script src="widget.js" type="text/javascript"></script>

You might also want to include jQuery if some some reason the widget can't load it. e.g.:

	<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js" type="text/javascript"></script>

Have fun!
