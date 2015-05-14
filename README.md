# Differences to the official spiderable package
The official spiderable package uses phantomjs and the stdout to browse the page and get the missing body. The used technologies create many problems on different environments and bugfixing is really complex. Spiderable2 uses zombie as the browser of choice which is better integrated with node and the package is reworked in general.

We are discussing some of the problems which are existing with the official spiderable package at:
https://github.com/iron-meteor/iron-router/issues/1192

# Installation
`meteor add lufrai:spiderable2`

# Settings
You can add the following settings in your **Meteor Settings Config json File**:
```json
{
	'spiderable2': {
		'timeout': 1000,
		'port': 3000,
		'verbose': false
	}
}
```

# Dependencies
make `apt-get install build-essential`

# Notes
This is an early prototype so please be careful and try it out before you deploy it in production!

# Known Problems
- There seems to be a problem in regards to meteor-pages, if you use that package spiderable will maybe not work correctly
- Style tags which were added dynamically `onTimeout` will eventually not being correctly added to the output! I had a problem where I dynamically added a style `display: block` to a div Element and the style was missing in the spiderable2 output
- Sometimes the performance is slow

# Planned Features
- verbose logging
- caching
- precaching (reocurring process caches urls by timeplan)

# Contribution
I always love contribution so don't be afraid to create pull requests!

# Forum Thread
Some weeks ago I created a forum topic to discuss missing features of the spiderable package. If you wanna give feedback for this package you obviously can add an answer to the thread:
https://forums.meteor.com/t/what-do-you-miss-in-your-spiderable-package/1971?u=katy_wings
