var express = require('express');
var router = express.Router();

// Helper modules
var util = require('util');
var request = require('request');
var embedly = require('embedly');
var EMBEDLY_KEY = process.env.EMBEDLY_API_KEY;
var validator = require('validator');


// Embed routes, which all have '/embed' as precursor
router
	.post('/twitter', function(req, res) {
	  var resData = { alerts: [] };
	  var oEmbedBase = 'https://api.twitter.com/1/statuses/oembed.json?url=';
	  var tweetUrl = req.body.url;
	  var oEmbedOptions = '&maxwidth=500&align=center&hide_thread=t&omit_script=t';
	  var twitterEmbedUrl = oEmbedBase + tweetUrl + oEmbedOptions;

	  request.get(twitterEmbedUrl, function(error, response, body) {
	  	if(error) {
	  		console.log(error);
	  		resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether Tweet URL is valid: ' + error });
	  		res.json(resData);
	  	} else {
	  		var embedInfo = JSON.parse(body);
				console.log(embedInfo);  		
				if(embedInfo.errors) {
					console.log(embedInfo.errors);
					resData.alerts.push({ type: 'danger', msg: 'Sorry, that Tweet does not appear to exist.' });
					res.json(resData);
				} else {
					// Extract Tweet ID from url and add to data
					embedInfo.tweetID = embedInfo.url.substring(embedInfo.url.lastIndexOf("/") + 1);
					// Response object
					resData.info = embedInfo;
					resData.alerts.push({ type: 'success', msg: 'This is a valid Tweet URL. Embed code retrieved.' });
					res.json(resData);
				}
	  	}
	  });
	})
	.post('/instagram', function(req, res) {
		var resData = { alerts: [] };
	  var oEmbedBase = 'http://api.instagram.com/publicapi/oembed/?url=';
	  var instagramUrl = req.body.url;
	  var oEmbedOptions = '&omitscript=true&maxwidth=500';
	  var instagramEmbedUrl = oEmbedBase + instagramUrl + oEmbedOptions;

	  request.get(instagramEmbedUrl, function(error, response, body) {
	  	if(error) {
	  		console.log(error);
	  		resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether Instagram URL is valid: ' + error });
	  		res.json(resData);
	  	} else {
	  		if(body === "No Media Match" || body === "No URL Match") {
					resData.alerts.push({ type: 'danger', msg: 'Sorry, that Instagram does not appear to exist.' });
					res.json(resData);
	  		} else {
	  			var embedInfo = JSON.parse(body);
					console.log(embedInfo);  	
	  			resData.info = embedInfo;
					resData.alerts.push({ type: 'success', msg: 'This is a valid Instagram URL. Embed code retrieved.' });
					res.json(resData);
	  		}
	  	}
	  });
	})
	.post('/vine', function(req, res) {
		var resData = { alerts: [] };		
	  var oEmbedBase = 'https://vine.co/oembed.json?url=';
	  var vineUrl = req.body.url;
	  var oEmbedOptions = '&maxwidth=480&omit_script=true';
	  var vineEmbedUrl = oEmbedBase + vineUrl + oEmbedOptions;
	  request.get(vineEmbedUrl, function(error, response, body) {
	  	if(error) {
	  		console.log(error);
	  		resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether Vine URL is valid: ' + error });
	  		res.json(resData);
	  	} else { 		
	  		if(response.statusCode !== 200) {
					resData.alerts.push({ type: 'danger', msg: 'Sorry, that Vine does not appear to exist.' });
					res.json(resData);
	  		} else {
	  			var embedInfo = JSON.parse(body);
					console.log(embedInfo);  	
	  			resData.info = embedInfo;
					resData.alerts.push({ type: 'success', msg: 'This is a valid Vine URL. Embed code retrieved.' });
					res.json(resData);
	  		}	  		
	  	}
	  });
	})
	.post('/youtube', function(req, res) {
		var resData = { alerts: [] };
		var youtubeUrl = req.body.url;
		new embedly({key: EMBEDLY_KEY}, function(err, api) {
		  if (!!err) {
		    console.error('Error creating Embedly api');
		    console.error(err.stack, api);
		    resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether YouTube URL is valid: ' + err });
		    return;
		  }
		  api.oembed({ url: youtubeUrl }, function(err, objs) {
		    if (!!err) {
		      console.error(err.stack, objs);
		      resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether YouTube URL is valid: ' + err });
		      return;
		    }
		    var embedInfo = objs[0];
		    if(embedInfo.provider_name === "YouTube" && embedInfo.url) {
		    	var videoID = embedInfo.url.substring(embedInfo.url.lastIndexOf("=") + 1);
		    	embedInfo.videoID = videoID;
		    	resData.info = embedInfo;
			    resData.alerts.push({ type: 'success', msg: 'This is a valid YouTube URL. Embed code retrieved.' });
			    res.json(resData);
		    } else {
		    	resData.alerts.push({ type: 'danger', msg: 'Sorry, that does not appear to be a valid YouTube video URL.' });
			    res.json(resData);
		    }
		  });
		});
	})
	.post('/vimeo', function(req, res) {
		var resData = { alerts: [] };
		var oEmbedBase = 'https://vimeo.com/api/oembed.json?url=';
	  var vimeoUrl = req.body.url;
	  var oEmbedOptions = '&maxwidth=500';
	  var vimeoEmbedUrl = oEmbedBase + vimeoUrl + oEmbedOptions;
	  request.get(vimeoEmbedUrl, function(error, response, body) {
	  	if(error) {
	  		console.log(error);
	  		resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether Vimeo URL is valid: ' + error });
	  		res.json(resData);
	  	} else {  		
				if(body === "404 Not Found" || body === undefined) {
					resData.alerts.push({ type: 'danger', msg: 'Sorry, that does not appear to be valid Vimeo URL.' });
					res.json(resData);
				} else {
					var embedInfo = JSON.parse(body);
					if(embedInfo.errors) {
						console.log(embedInfo.errors);
						resData.alerts.push({ type: 'danger', msg: 'Sorry, that Vimeo video does not appear to exist.' });
						res.json(resData);
					} else {
						// Response object
						resData.info = embedInfo;
						resData.alerts.push({ type: 'success', msg: 'This is a valid Vimeo video URL. Embed code retrieved.' });
						res.json(resData);
					}
				}
				
	  	}
	  });
	})
	.post('/webimageorvid', function(req, res) {
		var resData = { alerts: [] };
		var imageUrl = req.body.url;

		if(validator.isURL(imageUrl)) { 
			//console.log("Valid URL!"); 
			request({ url: imageUrl, method: 'HEAD' }, function(error, response, body) {
				if(error) {
					console.log(error);
					resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether image or video URL is valid: ' + error });
	  			res.json(resData);
				} else {
					console.log(response.headers);
					if(response.headers['content-type'].indexOf('image') > -1) {
						resData.alerts.push({ type: 'success', msg: 'This is a valid image URL.' });
						resData.info = { type: 'image', url: imageUrl };
						res.json(resData);
					} else if(response.headers['content-type'].indexOf('video/webm') > -1) {
						resData.alerts.push({ type: 'success', msg: 'This is a valid web video URL.' });
						resData.info = { type: 'video', url: imageUrl };
						res.json(resData);
					} else {
						resData.alerts.push({ type: 'danger', msg: 'Sorry, that URL does not appear to lead to an image.' });
						res.json(resData);
					}
				}
			});


		} else {
			console.log("Not valid Url!");
			resData.alerts.push({ type: 'danger', msg: 'Sorry, that URL does not appear to be valid.' });
			res.json(resData);
		}
	})
	.post('/soundcloud', function(req, res) {
		var resData = { alerts: [] };
		var oEmbedBase = 'https://soundcloud.com/oembed?format=json&url=';
		var oEmbedOptions = '&maxheight=305';
	  var soundcloudUrl = req.body.url;
	  var soundcloudEmbedUrl = oEmbedBase + soundcloudUrl + oEmbedOptions;
	  request.get(soundcloudEmbedUrl, function(error, response, body) {
	  	if(error) {
	  		console.log(error);
	  		resData.alerts.push({ type: 'danger', msg: 'Something went wrong checking whether Soundcloud URL is valid: ' + error });
	  		res.json(resData);
	  	} else {
	  		if(response.statusCode === 404) {
					resData.alerts.push({ type: 'danger', msg: 'Sorry, that Soundcloud audio does not appear to exist.' });
					res.json(resData);
	  		} else {
	  			console.log(body);
	  			var embedInfo = JSON.parse(body);
					console.log(embedInfo);  		
					if(embedInfo.errors) {
						console.log(embedInfo.errors);
						resData.alerts.push({ type: 'danger', msg: 'Sorry, that Soundcloud audio does not appear to exist.' });
						res.json(resData);
					} else {
						// Response object
						resData.info = embedInfo;
						resData.alerts.push({ type: 'success', msg: 'This is a valid Soundcloud URL. Embed code retrieved.' });
						res.json(resData);
					}
	  		}
	  	}
	  });
	});


module.exports = router;