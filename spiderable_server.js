var querystring = Npm.require('querystring');
var urlParser = Npm.require('url');
var Zombie = Npm.require('zombie');
var minify = Npm.require('html-minifier').minify;

// how long to let zombie run before we kill it
Spiderable2.timeout = 15*100000;

// list of bot user agents that we want to serve statically, but do
// not obey the _escaped_fragment_ protocol. The page is served
// statically to any client whos user agent matches any of these
// regexps. Users may modify this array.
//
// An original goal with the spiderable package was to avoid doing
// user-agent based tests. But the reality is not enough bots support
// the _escaped_fragment_ protocol, so we need to hardcode a list
// here. I shed a silent tear.
Spiderable2.allowedUserAgentRegExps = [
    /^facebookexternalhit/i,
    /^linkedinbot/i,
    /^twitterbot/i
];

Spiderable2.port = 3000;
Spiderable2.verbose = false;
Spiderable2._init = function () {
	// use Docker hostname if available to deal with proxy, otherwise append port if defined
    // need to also detemine if ssl is local or via proxy, this currently assumes ssl is in proxy
    // if ( process.env.PORT ) Spiderable2.port = process.env.PORT
    // ROOT URL?

	if ( !_.isUndefined( Meteor.settings.spiderable2 )){
		if ( !_.isUndefined( Meteor.settings.spiderable2.timeout ) ) Spiderable2.timeout = Meteor.settings.spiderable2.timeout;
		if ( !_.isUndefined( Meteor.settings.spiderable2.port ) ) Spiderable2.port = Meteor.settings.spiderable2.port;
		if ( !_.isUndefined( Meteor.settings.spiderable2.verbose ) ) Spiderable2.verbose = Meteor.settings.spiderable2.verbose;
		if ( !_.isUndefined( Meteor.settings.spiderable2.allowedUserAgentRegExps ) ) {
			Spiderable2.allowedUserAgentRegExps = _.union( Meteor.settings.spiderable2.allowedUserAgentRegExps, Spiderable2.allowedUserAgentRegExps );
		}
	}
};

// Exported for tests.
Spiderable2._verifyUrl = function ( siteAbsoluteUrl, requestUrl ) {
	// reassembling url without escaped fragment if exists
	var parsedUrl = urlParser.parse( requestUrl );
	var parsedQuery = querystring.parse( parsedUrl.query );
	delete parsedQuery[ '_escaped_fragment_' ];
	var parsedAbsoluteUrl = urlParser.parse( siteAbsoluteUrl );
	// If the ROOT_URL contains a path, Meteor strips that path off of the
	// request's URL before we see it. So we concatenate the pathname from
	// the request's URL with the root URL's pathname to get the full
	// pathname.
	if ( parsedUrl.pathname.charAt(0) === "/" ) parsedUrl.pathname = parsedUrl.pathname.substring( 1 );
	parsedAbsoluteUrl.pathname = urlParser.resolve( parsedAbsoluteUrl.pathname,parsedUrl.pathname );
	parsedAbsoluteUrl.query = parsedQuery;
	// `url.format` will only use `query` if `search` is absent
	parsedAbsoluteUrl.search = null;

	return urlParser.format( parsedAbsoluteUrl );
};

Spiderable2.loadBody = function( url, callback ) {
	if ( Spiderable2.verbose ) console.log( 'Loading page content from: ' + url );
	var zombie = new Zombie();
    zombie.visit( url, {
    	waitFor: Spiderable2.timeout,
    	//loadCSS: false,
    	debug: Spiderable2.verbose,
    	silent: !Spiderable2.verbose
    }, function() {
    	var pageReadyInterval = setInterval( function() {
    		pageReady = zombie.evaluate( '(typeof(Spiderable2) !== "undefined")' );
    		if ( pageReady ){
    			Meteor.clearInterval( pageReadyInterval );
    			if ( Spiderable2.verbose ) console.log( 'The page is now ready.' );
    			var spiderable2ReadyInterval = setInterval( function(){
    				spiderableReady = zombie.evaluate( 'Spiderable2.pageReadyEvaluation()' );
		    		if ( spiderableReady ) {
		    			if ( Spiderable2.verbose ) console.log( 'The page is now loaded' );
		    			Meteor.clearInterval( spiderable2ReadyInterval );
		    			setTimeout( function(){
		    				// JS generated Style Tags dont work
		    				var result = zombie.html();
			  				result = result.replace( /<script[^>]+>(.|\n|\r)*?<\/script\s*>/ig, '' );
			  				result = result.replace( '<meta name="fragment" content="!">', '' );
			  				result = minify( result, {
			  					collapseWhitespace: true,
			  					conservativeCollapse: true
			  				});
			  				if ( Spiderable2.verbose ) console.log( 'Returning page content to request.' );
			    			callback( null, result );
		    			}, 300 );
		    		}
    			}, 300 );
    		}
    	}, 300 );
    });
};

Spiderable2.start = function() {
	WebApp.connectHandlers.use(function ( req, res, next ) {
		// _escaped_fragment_ comes from Google's AJAX crawling spec:
		// https://developers.google.com/webmasters/ajax-crawling/docs/specification
		// This spec was designed during the brief era where using "#!" URLs was
		// common, so it mostly describes how to translate "#!" URLs into
		// _escaped_fragment_ URLs. Since then, "#!" URLs have gone out of style, but
		// the <meta name="fragment" content="!"> (see spiderable.html) approach also
		// described in the spec is still common and used by several crawlers.
		if ( /\?.*_escaped_fragment_=/.test( req.url ) ||
				_.any( Spiderable2.allowedUserAgentRegExps, function ( re ) {
	        		return re.test( req.headers['user-agent'] );
	    		}
		)) {
			// are we using force-ssl, or an unique port then use localhost
			// per http://docs.meteor.com/#forcessl
			// unencrypted connections from localhost are always accepted over HTTP.
			// TBD: exploits unknown

			if ( Meteor.absoluteUrl.defaultOptions.secure == true || process.env.PORT ){
			  var absoluteUrl = "http://localhost:" + Spiderable2.port;
			} else {
			  var absoluteUrl = Meteor.absoluteUrl();
			}

			var url = Spiderable2._verifyUrl( absoluteUrl , req.url );

			Spiderable2.loadBody( url, function( error, result ){
				if ( !error ) {
					res.writeHead( 200, { 'Content-Type': 'text/html; charset=UTF-8' } );
					res.end( result );
		        } else {
					// phantomjs failed. Don't send the error, instead send the
					// normal page.
					if (error && error.code === 127)
						Meteor._debug("spiderable: phantomjs not installed. Download and install from http://phantomjs.org/");
					else
						Meteor._debug("spiderable: phantomjs failed:", error, "\nstderr:", stderr);
					next();
		        }
			});
		} else {
			next();
		}
	});
}

Spiderable2._init();
Spiderable2.start();
