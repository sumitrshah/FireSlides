'use strict';

var FireSlidesViewer = angular.module("FireSlidesViewer", [
  'FireSlidesViewer.directives',
  'ngSanitize'
]);

// Angular directives for FireSlides viewer app
angular.module('FireSlidesViewer.directives', []).
	directive('slides', ['$http', '$timeout', '$sce', '$window', function($http, $timeout, $sce, $window) {
		return {
			restrict: 'E',
	    scope: {},
	    templateUrl: '/templates/slides.html',
	    link: function(scope, elem, attrs) { 
	    	
	    	// References to FireSlides firebase DB
		    var firebaseRef = new Firebase('https://fireslidesdb.firebaseio.com/');
		    var decksRef = firebaseRef.child('decks');		    
		    var postsRef = firebaseRef.child('posts');

		    scope.deckID = null;
		    scope.deck;
		    scope.invalidDeck = false;
		    scope.privateDeck = false;
		    scope.loaded = false;
		    scope.deckLoaded = false;
		    scope.postsLoaded = false;

		    scope.currentSlide = 0;

		    scope.initialNumPosts = null;
		    scope.postCount = 0;

		    scope.latestPost = {};
		    scope.readHistory = [true];
		    scope.read = true;
		    
		    scope.newPostHistory = [];

		    scope.keyboardOn = true;

		    scope.jumpToBeginning = function() {
		    	Reveal.slide(0, 0);
		    };

		    scope.jumpToEnd = function() {
		    	Reveal.slide(Reveal.getTotalSlides() - 1);
		    };

		    scope.goToNewPosts = function() {
		    	var snapshot = scope.newPostHistory.shift();
		    	Reveal.slide(snapshot[0] + 1, snapshot[1]);
		    };

		    scope.showSlides = true;
		    // Called when thread view toggled using upper left button 
		    scope.hideSlides = function(hide) {
		    	// Disable keyboard/touch movement for slides if hiding and vice versa
		    	hide ? scope.keyboardOn = false : scope.keyboardOn = true ;
		    	// Hide or show slides
		    	scope.showSlides = !hide; 
		    };

		    scope.getTimestamp = function(postDate) {
		    	return "(" + moment(postDate).fromNow() + ")";
		    };

		    scope.getPostHtml = function(post) {
		      return $sce.trustAsHtml(post.content);
		    };

		    scope.showCard = function(post) {
		    	var show;
		    	post.content ? show = true : show = false;
			    return show;
		    };

		    // Function for inserting Twitter and Instagram embeds into modal
		    scope.insertModalEmbed = function(post) {
		      if(post.embed && post.embed.exists) {
		        // Hack to make sure that widget rendering is not called twice
		        if(angular.element('#modal-embed' + post.id).children().length > 0) { 
		          return; 
		        } else {
		          switch(post.embed.type) {
		            case "twitter":
		            	angular.element('#modal-embed' + post.id).html('<div align=\"center\">' + post.embed.data.html + '</div>');
              		twttr.widgets.load(angular.element('#modal-embed' + post.id)[0]);
		              break;
		            case "instagram":
		              angular.element('#modal-embed' + post.id).html('<div align=\"center\">' + post.embed.data.html + '</div>');
		              instgrm.Embeds.process();
		              break;
		            default:
		              break;
		          }		          
		          return;
		        }
		      } else {
		        return;
		      }
		    };

		    
		    // BEGIN INITIALIZATION

		    // Get query from window location, which should contain deck ID
		    var query = $window.location.search;
		    query.indexOf("id=") ? scope.deckID = query.substring(query.indexOf("id=") + 3) : null;

		    // Pull deck information if URL contains deck ID query
		    if(scope.deckID) {
		    	// Hit firebase to see whether there is a deck associated with deck ID query
		      decksRef.child(scope.deckID).once('value', function(snapshot) {
		        var deck = snapshot.val();
		        // If firebase returns deck info, populate scope with deck data
		        if(deck) {
		          scope.deck = deck;
		          scope.deckLoaded = true;
		          console.log("Deck loaded.");
		          // Slides (posts) that are dynamically added or updated by users
		          scope.deck.posts = [];
		          // If there's a deck, set a watch function to run when initial posts are loaded
		          scope.$watch('postsLoaded', function(newValue, oldValue) { 							  	
						  	if(oldValue !== newValue) { 
						  		console.log("Posts loaded.");
						  		$timeout(function() { 
						  			// Create background embeds
							  		Reveal.createBackgrounds(); 
							  		// Jump to first slide
							  		Reveal.slide(0, 0);
							  		// Once posts loaded, set watch function to run when new post or reply added to deck
							  		scope.$watch('deck.posts', function(newValue, oldValue) {
							  			// Code below should only fire if a new post or reply has been added to the deck
										  if(scope.postsLoaded && oldValue !== newValue) { 
									  		
									  		$timeout(function() { 
									  			var currentSlide = Reveal.getIndices(); 
									  			if(scope.latestPost.type === "post") {
									  				console.log("New post added.");

									  				// Push index of new post into history
			            					scope.newPostHistory.push([ scope.deck.posts.length - 1, 0 ]);

									  				// Need to recreate backgrounds because new post will mess up slides
									  				Reveal.createBackgrounds();
									  				// Stay on current slide but update; need to account for slide being added to beginning when posts are reversed
									  				//scope.reverse ? Reveal.slide(currentSlide.h + 1, currentSlide.v) : Reveal.slide(currentSlide.h, currentSlide.v);
									  				Reveal.slide(currentSlide.h, currentSlide.v);


									  			} else if (scope.latestPost.type === "reply") {
									  				console.log("New reply added.");
									  			} else {
									  				console.log("Error!");
									  			}
									  		}, 0);
										  }							 
										}, true);
							  	}, 0);
						  	}
						  });
		          // Unfortunately, have to pull down entire set of post data to get initial number of posts/children
		          postsRef.child(scope.deck.id).once('value', function(snap) {
		          	scope.initialNumPosts = snap.numChildren();
		          	// Firebase listener to see whether there are posts associated with deck and to listen when additional posts added
		          	postsRef.child(scope.deck.id).on('child_added', function(snap) {    			          	
			          	var post = snap.val();	
			          	// Count number of replies in post and add as property of post
			          	var numReplies = 0;
			          	if(post.replies) {
			          		for (var key in post.replies) {
			          			if(post.replies.hasOwnProperty(key)) {
			          				numReplies++;
			          			}
										}
			          	} 
			          	post.numReplies = numReplies;
			          	// Add embed background url as property of post if applicable
			          	if(post.embed && post.embed.exists && (post.embed.type === 'twitter' || post.embed.type === 'instagram' )) { 		          		
			          		post.backgroundUrl = "/embed.html?type=" + post.embed.type + "&url=" + post.embed.data.url;
			          	}
			          	// Add post to scope, increase post count, check if initial posts loaded, update read history, and store reference to latest post
			            $timeout(function() { 			            	
			            	scope.deck.posts.push(post);
			            	scope.postCount++;
			            	if(scope.postCount === scope.initialNumPosts) { scope.postsLoaded = true; }
			            	// Initialize read history for post
			            	scope.readHistory.push(false);
			            	// Store reference to latest post
			            	scope.latestPost.type = 'post';
			            	scope.latestPost.post = post;
			            }, 0);              
			          });
								// Firebase listener to see whether any post has changed (i.e., when reply is added) 
								postsRef.child(scope.deck.id).on('child_changed', function(childSnapshot) {
								  var changedPost = childSnapshot.val();
								  // When changed post returned by firebase, find index of the post that has been changed on the scope 
								  var indexOfChangedPost;
								  for(var i = 0; i < scope.deck.posts.length; i++) {
								  	if(scope.deck.posts[i].id ===  changedPost.id) { indexOfChangedPost = i; }
								  }
								  // Using index of changed post, change array to include changed post
								  $timeout(function() { 
								  	// Increment client-side numReplies property by 1 to reflect to new reply
								  	changedPost.numReplies = scope.deck.posts[indexOfChangedPost].numReplies + 1;
								  	// Rest read history for post to false
								  	scope.readHistory[indexOfChangedPost + 1] = false;
								  	// Set changed post
								  	scope.deck.posts[indexOfChangedPost] = changedPost; 

								  	// Push location of new reply into history
								  	scope.newPostHistory.push([ indexOfChangedPost, changedPost.numReplies ]);

								  	// Store reference to latest reply
			            	scope.latestPost.type = 'reply';
			            	scope.latestPost.indexOfChangedPost = indexOfChangedPost;
			            	scope.latestPost.post = changedPost;
								  }, 0);
								});
		          });
		        } else {
		          console.log("Invalid Deck ID!");
		          $timeout(function() {
		      			scope.invalidDeck = true;
		      			scope.deckLoaded = true;
		      		}, 0);
		        }
		      }, function(err) {		      	
		      	console.log(err);
		      	if(err.code === "PERMISSION_DENIED") {
		      		$timeout(function() {
		      			scope.privateDeck = true;
		      			scope.deckLoaded = true;
		      		}, 0);
		      	}
		      });
		    } else {
		      console.log("Specify deck in URL.");
		    }

		    // Initialize Reveal
		    Reveal.initialize({
		    	width: 1200,
		    	height: 730,
			    controls: true,
			    progress: false,
			    keyboardCondition: toggleKeyboard,
			    history: true,
			    touch: true,
			    hideAddressBar: true,			    
			    center: true,
			    transition: 'slide' // none/fade/slide/convex/concave/zoom
			  });

			  // Function for keyboardCondition that returns whether or not keyboard is on
			  function toggleKeyboard() {
			  	return scope.keyboardOn;
			  }

		    // Functions to run when slide is changed
			  Reveal.addEventListener('slidechanged', function(event) {			

			  	var currentSlide = Reveal.getIndices();

			  	$timeout(function() { 
			  		scope.currentSlide = currentSlide.h;
			  		// UI updated to reflect whether current slide unread
			  		scope.read = scope.readHistory[currentSlide.h]
			  		// Once slide has been changed to current slide, mark that slide read history as true
			  		scope.readHistory[currentSlide.h] = true;
			  	}, 0);

				});

		    // Necessary for case where Bootstrap modal closes without clicking on close buttons
		    angular.element('#threadModal').on('hidden.bs.modal', function (e) { angular.element('#threadCloseButton').trigger('click'); });

	    }
		};
	}]);