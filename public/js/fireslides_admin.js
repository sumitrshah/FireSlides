'use strict';

var FireSlides = angular.module('FireSlidesAdmin', [
  'FireSlidesAdmin.controllers',
  'textAngular'
]);

// Angular controllers for FireSlides app
angular.module('FireSlidesAdmin.controllers', []).
  controller('MainController', ['$scope', '$timeout', '$window', '$http', '$sce', function($scope, $timeout, $window, $http, $sce) {  

    // Logged in user info
    $scope.user = {};
    $scope.loggedIn = false;

    // User deck info    
    $scope.decks = [];

    // Bool for tracking when first deck has been pulled from Firebase
    $scope.firstDeckPulled = false;

    // Reference to currently loaded deck in decks array
    $scope.currentDeck = null;

    // Variables holding new post and reply HTML
    $scope.postHtml = "";
    $scope.replyHtml = {};

    // Embed info
    $scope.embedInfo = {
      tweetUrl: null,
      instagramUrl: null,
      vineUrl: null,
      youtubeUrl: null,
      vimeoUrl: null,
      webImageVidUrl: null,
      soundcloudUrl: null
    };
    
    // Model input variables for new deck
    $scope.newDeckTitle;
    $scope.orgAssignment;
    $scope.deckType = "public";

    // UI elements
    $scope.UI = {
      showLoggingIn: false,
      showLoadingDecks: false,
      showNewDeckOptions: false,
      showProfile: false,
      showPostBox: false,
      showPostEmbed: {
        twitter: false,
        instagram: false,
        vine: false,
        youtube: false,
        vimeo: false,
        webImageVid: false,
        soundcloud: false,
        imageUpload: false,
      },
      showEmbedSpinner: false,
      disablePostSubmitButton: false,
      showReplyBox: {},
      alerts: {
        general: [{ type: 'info', msg: 'Log in to view admin page . . .' }],
        newDeckAlerts: [],
        postAlerts: [],
        replyAlerts: {}
      }
    };
    // Functions for closing alert boxes
    $scope.closeGeneralAlert = function(index) {
      $scope.UI.alerts.general.splice(index, 1);
    }
    $scope.closeNewDeckAlert = function(index) {
      $scope.UI.alerts.newDeckAlerts.splice(index, 1);
    }
    $scope.closePostAlert = function(index) {
      $scope.UI.alerts.postAlerts.splice(index, 1);
    }
    $scope.closeReplyAlert = function(postID, index) {
      $scope.UI.alerts.replyAlerts[postID].splice(index, 1);
    }

    // References to FireSlides firebase DB
    var firebaseRef = new Firebase('https://fireslidesdb.firebaseio.com/');
    var decksRef = firebaseRef.child('decks');
    var deckUsersRef = firebaseRef.child('deck-users');
    var usersRef = firebaseRef.child('users');
    var postsRef = firebaseRef.child('posts');

    // On button click, logout or unauth
    $scope.logout = function() { 
      firebaseRef.unauth(); 
      $scope.decks = [];
      $scope.currentDeck = null;
      $scope.user = {};
      $scope.UI.showProfile = false;
      $scope.UI.showNewDeckOptions = false;
      $scope.UI.alerts.general = [];
      $scope.UI.alerts.general.push({ type: 'info', msg: 'You have successfully logged out.' });
      // Redirect to login page
      $window.location.href = "/login.html"
    };

    // On auth, do various things, including populate user data and pull user decks
    firebaseRef.onAuth(function(authData) {
      if(authData) {
        //console.log("User " + authData.uid + " is logged in with " + authData.provider);    
        
        $timeout(function() {
          $scope.loggedIn = true;
          $scope.UI.alerts.general = [];

          // Populate user info w/ auth data (note: still must pull user profile info)            
          $scope.user.userId = authData.uid;
          $scope.user.provider = authData.provider;
          $scope.user.token = authData.token;
          $scope.user.auth = authData.auth;
          $scope.user.expires = authData.expires;

          switch(authData.provider) {
            case "google":
              $scope.user.google = authData.google;
              $scope.user.name = authData.google.displayName;
              $scope.user.email = authData.google.email;
              $scope.user.providerInfo = {
                displayName: authData.google.displayName,
                email: authData.google.email
              };
              break;
            case "twitter":
              $scope.user.twitter = authData.twitter;
              $scope.user.name = authData.twitter.displayName;
              $scope.user.providerInfo = {
                displayName: authData.twitter.displayName,
                username: authData.twitter.username
              };
              break;
            case "password":
              $scope.user.email = authData.password.email;
              $scope.user.providerInfo = {
                email: authData.password.email,
              };
              break;
            default:
              break;
          }

          // Alert that lets user know they are logged in            
          //$scope.UI.alerts.general.push({ type: 'success', msg: 'You are logged in as:  ' + $scope.user.name + ' (' + $scope.user.provider + ')' });

          pullUserInfo($scope.user.userId);
          pullUserDecks($scope.user.userId);

        }, 0);
      } else {
        console.log("User is logged out. Must be logged in to create deck or add posts to deck.");
        $scope.loggedIn = false;
      }
    });

    // On button click, shows user profile (if logged in)     
    $scope.showProfile = function() {
      // Clear UI data for former deck
      $scope.UI.showPostBox = false;
      $scope.UI.showReplyBox = {};
      $scope.UI.alerts = {
        general: [],
        newDeckAlerts: [],
        postAlerts: [],
        replyAlerts: {}
      };
      if($scope.user.userId && $scope.loggedIn) { 
        $scope.UI.showProfile = true;
        $scope.UI.showNewDeckOptions = false;
        $scope.currentDeck = null;
      } else {
        console.log("You're not logged in, so cannot show user profile.");
        $scope.UI.alerts.general.push({ type: 'warning', msg: 'Can\'t show user profile unless user is logged in.'});
      }
    };


    // On button click, shows options for creating new deck
    $scope.showNewDeckOptions = function() { 
      // Clear all alerts
      $scope.UI.alerts = {
        general: [],
        newDeckAlerts: [],
        postAlerts: [],
        replyAlerts: {}
      };

      if($scope.user.userId && $scope.loggedIn) {
        $scope.UI.showNewDeckOptions = true; 
        $scope.UI.showProfile = false;
        $scope.currentDeck = null;
      } else {
        console.log("You're not logged in, so cannot create new deck.");
        $scope.UI.alerts.general.push({ type: 'warning', msg: 'Can\'t create new deck unless user is logged in.'});
      }
    };

    // Creates New deck
    $scope.createDeck = function(deckTitle, cb) {     
      // Clear all alerts
      $scope.UI.alerts = {
        general: [],
        newDeckAlerts: [],
        postAlerts: [],
        replyAlerts: {}
      }; 
      if($scope.user.userId && $scope.loggedIn) {

        // Validate text so that no white space
        if(deckTitle && !(deckTitle.replace(/^\s+|\s+$/gm,'').length == 0)) { 
          console.log("Creating new deck . . . ");

          // Create new unique deck ID
          var newDeckRef = decksRef.push();
          // Populate deck object, including with unique ID created in FB
          var newDeck = {
            id: newDeckRef.key(),
            title: deckTitle || "No Title",
            type: $scope.deckType || 'public',
            createdAt: Firebase.ServerValue.TIMESTAMP,
            createdBy: $scope.user.userId,
            open: true
          };
          // Set new deck ref with deck object
          newDeckRef.set(newDeck, function(error) {
            if(!error) {
              console.log("New deck sucessfully created: ", newDeckRef.key());
              var newDeckID = newDeckRef.key().toString(); 
              var creatorID = $scope.user.userId;
              // Add creator as user of deck in deck-users
              deckUsersRef.child(newDeckID).child(creatorID).set(true);
              usersRef.child(creatorID).child("decks").child(newDeckID).set(true);
              $timeout(function() { 
                // Reset form
                $scope.newDeckTitle = "";
                $scope.newDeckSubtitle = "";
                $scope.orgAssignment = false;                
                $scope.deckType = "public";
                // Alert
                $scope.UI.alerts.newDeckAlerts.push({ type: 'success', msg: 'New deck sucessfully created: ' + newDeckRef.key() });
              }, 0);
            } else {
              $scope.UI.alerts.newDeckAlerts.push({ type: 'danger', msg: 'There was an error while trying to create new deck!' });
            }
            if(cb) {
              cb(newDeckRef.key());
            }
          });
        } else {
          console.log("You haven't entered a title for this new deck.");
          $scope.UI.alerts.newDeckAlerts.push({ type: 'warning', msg: 'You haven\'t entered a title for this new deck.'});
        }
      } else {
        console.log("Can't create new deck unless user is logged in.");
        $scope.UI.alerts.general.push({ type: 'warning', msg: 'Can\'t create new deck unless user is logged in.'});
      }
    };

    // On click, hides and unhides text area for creating new post
    $scope.showPostBox = function() {
      $scope.UI.showPostBox = !$scope.UI.showPostBox;      
    };

    // Creates new post
    $scope.newPost = function(deckID) {
      $scope.UI.alerts.postAlerts = [];
      if($scope.user.userId && $scope.loggedIn) {
        console.log("New post . . .");

        //var textarea = angular.element('#post_' + deckID);
        //var content = textarea.val();

        var content = $scope.postHtml;

        // Validate text so that no white space and add to firebase
        if(content && !(content.replace(/^\s+|\s+$/gm,'').length == 0)) {
          // Make sure all links have external target
          var externalTargetHtml = angular.element(content);
          externalTargetHtml.find('a').attr('target', '_blank');
          content = "";
          for(var i = 0; i < externalTargetHtml.length; i++) {
            content += externalTargetHtml[i].outerHTML;
          }
          // Create new unique post ID
          var newPostRef = postsRef.child(deckID).push();
          var newPost = {
            id: newPostRef.key(), 
            poster: {
              id: $scope.user.userId,
              name: $scope.user.name
            },
            content: content,
            attachment: "",
            embed: { exists: false },
            date: Firebase.ServerValue.TIMESTAMP
          };

          newPostRef.set(newPost, function(error) {
            if(!error) {
              console.log("New post created: ", newPostRef.key());
              var newPostID = newPostRef.key().toString();               
              $timeout(function() { 
                //textarea.val('') ;
                $scope.postHtml = "";

                $scope.UI.showPostBox = false;
              }, 0);
            } else {
              $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
            }
          });
        } else {
          console.log("You haven't entered anything to post, or you have exceeded the 600 character limit!");
          $scope.UI.alerts.postAlerts.push({ type: 'warning', msg: 'You haven\'t entered anything to post, or you have exceeded the 600 character limit.'});
        }
      } else {
        console.log("Can't post unless user is logged in.");
        $scope.UI.alerts.postAlerts.push({ type: 'warning', msg: 'Can\'t post unless user is logged in.'});
      }
    };

    // On click, hides and unhides text area for creating new reply (tied to particular post)
    $scope.showReplyBox = function(postID) {
      $scope.UI.showReplyBox[postID] ? $scope.UI.showReplyBox[postID] = false : $scope.UI.showReplyBox[postID] = true;
    };
    
    $scope.postReply = function(deckID, postID) {
      // Create or clear reply alerts array
      $scope.UI.alerts.replyAlerts[postID] = [];
      if($scope.user.userId && $scope.loggedIn) {
        console.log("New reply . . . ");

        var content = $scope.replyHtml[postID];

        

        // Validate text so no white space
        if(content && !(content.replace(/^\s+|\s+$/gm,'').length == 0)) {

          // Make sure all links have external target
          var externalTargetHtml = angular.element(content);
          externalTargetHtml.find('a').attr('target', '_blank');
          content = "";
          for(var i = 0; i < externalTargetHtml.length; i++) {
            content += externalTargetHtml[i].outerHTML;
          }
          
          // Create new unique reply post ID
          var newReplyRef = postsRef.child(deckID).child(postID).child('replies').push();
          var newReply = {
            id: newReplyRef.key(), 
            poster: {
              id: $scope.user.userId,
              name: $scope.user.name
            },
            content: content,
            attachment: "",
            embed: { exists: false },
            date: Firebase.ServerValue.TIMESTAMP
          };
          newReplyRef.set(newReply, function(error) {
            if(!error) {
              //console.log("Reply added to post: ", newReplyRef.key());
              $timeout(function() { 
                //textarea.val('');
                $scope.replyHtml[postID] = "";
                $scope.showReplyBox(postID); 
              }, 0);
            }
          });
        } else {
          console.log("You haven't entered anything to post as a reply, or you have exceeded the 600 character limit!");
          $scope.UI.alerts.replyAlerts[postID].push({ type: 'warning', msg: 'You haven\'t entered anything to post as a reply, or you have exceeded the 600 character limit.'});
        }
      } else {
        console.log("Can't post unless user is logged in.");
        $scope.UI.alerts.replyAlerts[postID].push({ type: 'warning', msg: 'Can\'t post reply unless user is logged in.'});
      }
    };


    $scope.showEmbedOption = function(embedType) {
      switch(embedType) {
        case "twitter":
          $scope.UI.showPostEmbed = {
            twitter: true,
            instagram: false,
            vine: false,
            youtube: false,
            vimeo: false,
            webImageVid: false,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "instagram":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: true,
            vine: false,
            youtube: false,
            vimeo: false,
            webImageVid: false,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "vine":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: true,
            youtube: false,
            vimeo: false,
            webImageVid: false,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "youtube":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: false,
            youtube: true,
            vimeo: false,
            webImageVid: false,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "vimeo":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: false,
            youtube: false,
            vimeo: true,
            webImageVid: false,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "webImageVid":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: false,
            youtube: false,
            vimeo: false,
            webImageVid: true,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "soundcloud":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: false,
            youtube: false,
            vimeo: false,
            webImageVid: false,
            soundcloud: true,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "imageUpload":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: false,
            youtube: false,
            vimeo: false,
            webImageVid: false,
            soundcloud: false,
            imageUpload: true,
          };
          $scope.UI.disablePostSubmitButton = true;
          break;
        case "none":
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: false,
            youtube: false,
            vimeo: false,
            webImageVid: false,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = false;
          break;
        default:
          $scope.UI.showPostEmbed = {
            twitter: false,
            instagram: false,
            vine: false,
            youtube: false,
            vimeo: false,
            webImageVid: false,
            soundcloud: false,
            imageUpload: false,
          };
          $scope.UI.disablePostSubmitButton = false;
          break;
      }
    };

    $scope.submitEmbed = function(deckID, embedType) {
      $scope.UI.alerts.postAlerts = [];  
      $scope.UI.showEmbedSpinner = true;
      switch(embedType) {
        case "twitter":
          console.log("Check for " + embedType + " embed using: " + $scope.embedInfo.tweetUrl);
          // Talk to server to get Tweet embed html
          $http.post('/embeds/twitter', { url: $scope.embedInfo.tweetUrl}).
            success(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.showEmbedOption('none');
              if(data.alerts[0].type === 'success') {
                console.log(data.info);

                // Add post to DB

                var content = data.info.html;

                // Create new unique post ID
                
                var newPostRef = postsRef.child(deckID).push();
                var newPost = {
                  id: newPostRef.key(), 
                  poster: {
                    id: $scope.user.userId,
                    name: $scope.user.name
                  },
                  content: "",
                  attachment: "",
                  embed: { exists: true, type: 'twitter', data: data.info },
                  date: Firebase.ServerValue.TIMESTAMP
                };

                newPostRef.set(newPost, function(error) {
                  if(!error) {
                    console.log("New post created: ", newPostRef.key());
                    var newPostID = newPostRef.key().toString();               
                    $timeout(function() { 
                      $scope.postHtml = "";
                      $scope.UI.showPostBox = false;
                    }, 0);
                  } else {
                    $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
                  }
                });

              } else {
                console.log(data.alerts[0].msg);
                $scope.UI.alerts.postAlerts.push({ 
                  type: 'danger', msg: data.alerts[0].msg
                });
              }
            }).
            error(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.UI.alerts.postAlerts.push({ 
                type: 'danger', msg: 'Something went wrong checking whether the Tweet URL is valid.'
              });
            });
          // Clear embed input
          $scope.embedInfo.tweetUrl = "";          
          break;
        case "instagram":
          console.log("Check for " + embedType + " embed using: " + $scope.embedInfo.instagramUrl);
          var instagramUrl = $scope.embedInfo.instagramUrl;
          // Talk to server to get Instagram embed html
          $http.post('/embeds/instagram', { url: $scope.embedInfo.instagramUrl}).
            success(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.showEmbedOption('none');
              if(data.alerts[0].type === 'success') {
                //console.log(data.info);

                // Add url to Instagram data
                data.info.url = instagramUrl;

                console.log(data.info);

                // Create new unique post ID and add to DB
                var newPostRef = postsRef.child(deckID).push();
                var newPost = {
                  id: newPostRef.key(), 
                  poster: {
                    id: $scope.user.userId,
                    name: $scope.user.name
                  },
                  content: "",
                  attachment: "",
                  embed: { exists: true, type: 'instagram', data: data.info },
                  date: Firebase.ServerValue.TIMESTAMP
                };

                newPostRef.set(newPost, function(error) {
                  if(!error) {
                    console.log("New post created: ", newPostRef.key());
                    var newPostID = newPostRef.key().toString();               
                    $timeout(function() { 
                      $scope.postHtml = "";
                      $scope.UI.showPostBox = false;
                    }, 0);
                  } else {
                    $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
                  }
                });


              } else {
                console.log(data.alerts[0].msg);
                $scope.UI.alerts.postAlerts.push({ 
                  type: 'danger', msg: data.alerts[0].msg
                });
              }
            }).
            error(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.UI.alerts.postAlerts.push({ 
                type: 'danger', msg: 'Something went wrong checking whether the Instagram URL is valid.'
              });
            });
          // Clear embed input
          $scope.embedInfo.instagramUrl = "";
          break;
        case "vine":
          console.log("Check for " + embedType + " embed using: " + $scope.embedInfo.vineUrl);
          // Talk to server to get Vine embed html
          $http.post('/embeds/vine', { url: $scope.embedInfo.vineUrl}).
            success(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.showEmbedOption('none');
              if(data.alerts[0].type === 'success') {
                console.log(data.info);

                // Add post to DB

                var content = "<div align=\"center\"><div style=\"max-width:60%\" class=\"center-block\"><div class=\"embed-vine\">" + data.info.html + "</div></div></div>"; 

                // Create new unique post ID
                var newPostRef = postsRef.child(deckID).push();
                var newPost = {
                  id: newPostRef.key(), 
                  poster: {
                    id: $scope.user.userId,
                    name: $scope.user.name
                  },
                  content: content,
                  attachment: "",
                  embed: { exists: true, type: 'vine', data: data.info },
                  date: Firebase.ServerValue.TIMESTAMP
                };

                newPostRef.set(newPost, function(error) {
                  if(!error) {
                    console.log("New post created: ", newPostRef.key());
                    var newPostID = newPostRef.key().toString();               
                    $timeout(function() { 
                      $scope.postHtml = "";
                      $scope.UI.showPostBox = false;
                    }, 0);
                  } else {
                    $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
                  }
                });


              } else {
                console.log(data.alerts[0].msg);
                $scope.UI.alerts.postAlerts.push({ 
                  type: 'danger', msg: data.alerts[0].msg
                });
              }
            }).
            error(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.UI.alerts.postAlerts.push({ 
                type: 'danger', msg: 'Something went wrong checking whether the Instagram URL is valid.'
              });
            });
          // Clear embed input
          $scope.embedInfo.vineUrl = "";
          break;
        case "youtube":
          console.log("Check for " + embedType + " embed using: " + $scope.embedInfo.youtubeUrl);
          $http.post('/embeds/youtube', { url: $scope.embedInfo.youtubeUrl }).
            success(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.showEmbedOption('none');
              if(data.alerts[0].type === 'success') {
                //console.log(data.info);

                var content = "";
                content = '<div align=\"center\"><div style=\"max-width:80%\" class=\"center-block\"><div class=\"embed-responsive embed-responsive-16by9\"><iframe type=\"text/html\" class=\"embed-responsive-item\" width=\"500\" height=\"280\" src=\"http://www.youtube.com/embed/' + 
                            data.info.videoID + '\" frameborder=\"0\"/></div></div></div>';

                // Add post to DB
                var newPostRef = postsRef.child(deckID).push();
                var newPost = {
                  id: newPostRef.key(), 
                  poster: {
                    id: $scope.user.userId,
                    name: $scope.user.name
                  },
                  content: content,
                  attachment: "",
                  embed: { exists: true, type: 'youtube', data: data.info },
                  date: Firebase.ServerValue.TIMESTAMP
                };

                newPostRef.set(newPost, function(error) {
                  if(!error) {
                    console.log("New post created: ", newPostRef.key());
                    var newPostID = newPostRef.key().toString();               
                    $timeout(function() { 
                      $scope.postHtml = "";
                      $scope.UI.showPostBox = false;
                    }, 0);
                  } else {
                    $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
                  }
                });


              } else {
                console.log(data.alerts[0].msg);
                $scope.UI.alerts.postAlerts.push({ 
                  type: 'danger', msg: data.alerts[0].msg
                });
              }
            }).
            error(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.UI.alerts.postAlerts.push({ 
                type: 'danger', msg: 'Something went wrong checking whether the YouTube URL is valid.'
              });
            });
          // Clear embed input
          $scope.embedInfo.youtubeUrl = "";
          break;
        case "vimeo":
          console.log("Check for " + embedType + " embed using: " + $scope.embedInfo.vimeoUrl);

          $http.post('/embeds/vimeo', { url: $scope.embedInfo.vimeoUrl }).
            success(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.showEmbedOption('none');
              if(data.alerts[0].type === 'success') {
                console.log(data.info);

                var content = "";
                content = '<div align=\"center\"><div style=\"max-width:80%\" class=\"center-block\"><div class=\"embed-responsive embed-responsive-16by9\">' + data.info.html + '</div></div></div>';

                // Add post to DB
                
                var newPostRef = postsRef.child(deckID).push();
                var newPost = {
                  id: newPostRef.key(), 
                  poster: {
                    id: $scope.user.userId,
                    name: $scope.user.name
                  },
                  content: content,
                  attachment: "",
                  embed: { exists: true, type: 'vimeo', data: data.info },
                  date: Firebase.ServerValue.TIMESTAMP
                };

                newPostRef.set(newPost, function(error) {
                  if(!error) {
                    console.log("New post created: ", newPostRef.key());
                    var newPostID = newPostRef.key().toString();               
                    $timeout(function() { 
                      $scope.postHtml = "";
                      $scope.UI.showPostBox = false;
                    }, 0);
                  } else {
                    $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
                  }
                });


              } else {
                console.log(data.alerts[0].msg);
                $scope.UI.alerts.postAlerts.push({ 
                  type: 'danger', msg: data.alerts[0].msg
                });
              }
            }).
            error(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.UI.alerts.postAlerts.push({ 
                type: 'danger', msg: 'Something went wrong checking whether the Vimeo URL is valid.'
              });
            });

          // Clear embed input
          $scope.embedInfo.vimeoUrl = "";
          break;
        case "webImageVid":
          console.log("Check for " + embedType + " embed using: " + $scope.embedInfo.webImageVidUrl);
          var webImageVidUrl = $scope.embedInfo.webImageVidUrl;
          $http.post('/embeds/webimageorvid', { url: webImageVidUrl }).
            success(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.showEmbedOption('none');
              if(data.alerts[0].type === 'success') {
                var content = "";
                var embedInfo = { exists: true };
                // Content 
                if(data.info.type === 'image') {
                  console.log("You found an image!");
                  content = '<div align=\"center\"><div style=\"max-width:600px;\"><img class=\"img-responsive img-rounded\" src=\"' + webImageVidUrl + '\" /></div></div>';
                  embedInfo.type = 'imageUrl';
                  embedInfo.data = { url: data.info.url };
                } else if(data.info.type === 'video') {
                  console.log("You found a video!");
                  content = '<div align=\"center\"><video src=\"' + webImageVidUrl + '\" style=\"width:100%;max-width:600px;height:auto;\" controls></video></div>';
                  embedInfo.type = 'videoUrl';
                  embedInfo.data = { url: data.info.url };
                } else {
                  console.log("Something is screwy!");
                }

                // Add post to DB
                var newPostRef = postsRef.child(deckID).push();
                var newPost = {
                  id: newPostRef.key(), 
                  poster: {
                    id: $scope.user.userId,
                    name: $scope.user.name
                  },
                  content: content,
                  attachment: "",
                  embed: embedInfo,
                  date: Firebase.ServerValue.TIMESTAMP
                };

                newPostRef.set(newPost, function(error) {
                  if(!error) {
                    console.log("New post created: ", newPostRef.key());
                    var newPostID = newPostRef.key().toString();               
                    $timeout(function() { 
                      $scope.postHtml = "";
                      $scope.UI.showPostBox = false;
                    }, 0);
                  } else {
                    $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
                  }
                });


              } else {
                console.log(data.alerts[0].msg);
                $scope.UI.alerts.postAlerts.push({ 
                  type: 'danger', msg: data.alerts[0].msg
                });
              }
            }).
            error(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.UI.alerts.postAlerts.push({ 
                type: 'danger', msg: 'Something went wrong checking whether the image URL is valid.'
              });
            });
          $scope.embedInfo.webImageVidUrl = "";
          break;
        case "soundcloud":
          console.log("Check for " + embedType + " embed using: " + $scope.embedInfo.soundcloudUrl);

          $http.post('/embeds/soundcloud', { url: $scope.embedInfo.soundcloudUrl }).
            success(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.showEmbedOption('none');
              if(data.alerts[0].type === 'success') {
                console.log(data.info);

                var content = "";
                content = '<div align=\"center\"><div style=\"max-width:60%\" class=\"center-block\">' + data.info.html + '</div></div>';

                // Add post to DB
                
                var newPostRef = postsRef.child(deckID).push();
                var newPost = {
                  id: newPostRef.key(), 
                  poster: {
                    id: $scope.user.userId,
                    name: $scope.user.name
                  },
                  content: content,
                  attachment: "",
                  embed: { exists: true, type: 'soundcloud', data: data.info },
                  date: Firebase.ServerValue.TIMESTAMP
                };

                newPostRef.set(newPost, function(error) {
                  if(!error) {
                    console.log("New post created: ", newPostRef.key());
                    var newPostID = newPostRef.key().toString();               
                    $timeout(function() { 
                      $scope.postHtml = "";
                      $scope.UI.showPostBox = false;
                    }, 0);
                  } else {
                    $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
                  }
                });


              } else {
                console.log(data.alerts[0].msg);
                $scope.UI.alerts.postAlerts.push({ 
                  type: 'danger', msg: data.alerts[0].msg
                });
              }
            }).
            error(function(data, status, headers, config) {
              $scope.UI.showEmbedSpinner = false;
              $scope.UI.alerts.postAlerts.push({ 
                type: 'danger', msg: 'Something went wrong checking whether the Soundcloud URL is valid.'
              });
            });

          // Clear embed input
          $scope.embedInfo.soundcloudUrl = "";
          break;

        case "imageUpload":
          console.log("Check embed: ", embedType);
          $scope.UI.showEmbedSpinner = false;
          break;
        default:
          $scope.UI.showEmbedSpinner = false;
          $scope.showEmbedOption('none');
          break;  
      }
    };


    // Changes current deck info so that it references selected deck
    $scope.loadDeck = function(deckIndex) {      
      $scope.UI.showNewDeckOptions = false;
      $scope.UI.showProfile = false;
      $scope.currentDeck = $scope.decks[deckIndex];
      $scope.postHtml = "";
      $scope.replyHtml = {};

      // Clear UI data for former deck
      $scope.UI.showPostBox = false;
      $scope.UI.showReplyBox = {};
      $scope.UI.alerts = {
        general: [],
        newDeckAlerts: [],
        postAlerts: [],
        replyAlerts: {}
      };

      if($scope.currentDeck.loaded) {
        //console.log("Deck posts have already been pulled.")
      } else {
        //console.log("Deck posts have NOT been pulled yet. Pulling . . . ");
        // Pull deck posts
        postsRef.child($scope.currentDeck.id).on('child_added', function(snap) {
          $timeout(function() {
            $scope.currentDeck.posts.unshift(snap.val());
          }, 0);              
        });
        // For handling UI update when a reply is added 
        postsRef.child($scope.currentDeck.id).on('child_changed', function(childSnapshot) {
          // Code to handle change in posts -- usually, when reply is added
          //console.log('Post changed.');
          var changedPost = childSnapshot.val();
          var indexOfChangedPost;
          for(var i = 0; i < $scope.currentDeck.posts.length; i++) {
            if($scope.currentDeck.posts[i].id ===  changedPost.id) { indexOfChangedPost = i; }
          }
          $timeout(function() { $scope.currentDeck.posts[indexOfChangedPost] = changedPost; }, 0);
        });
        // Set deck loaded flag to true
        $scope.currentDeck.loaded = true;
      }
    };

    // Pull down logged in user's profile info (or set if not in DB)
    function pullUserInfo(userId) {
      var userRef = usersRef.child(userId);
      // Pull user info from DB
      userRef.once('value', function(snapshot) { 
        var info = snapshot.val();
        // Create new Firebase user if user info does not already exist
        if(!info) {
          var newUserInfo = { 
            id: $scope.user.userId,
            joined: Firebase.ServerValue.TIMESTAMP,
            name: $scope.user.name || "",
            email: $scope.user.email || ""
          };
          userRef.set(newUserInfo, function(error) {
            if(error) { 
              console.log("Error authenticating: ", error); }
            // Update UI with user info and notification of log in
            $timeout(function() { 
              $scope.user.name = newUserInfo.name;
              $scope.user.email = newUserInfo.email;
              $scope.user.joined = newUserInfo.joined;
              $scope.UI.alerts.general.push({ type: 'success', msg: 'You are logged in as:  ' + $scope.user.name + ' (' + $scope.user.provider + ')' });
            }, 0);
          });
        } else {
          // Update UI with user info and notification of log in
          $timeout(function() { 
            $scope.user.name = info.name;
            $scope.user.email = info.email;
            $scope.user.joined = info.joined;
            $scope.UI.alerts.general.push({ type: 'success', msg: 'You are logged in as:  ' + $scope.user.name + ' (' + $scope.user.provider + ')' });
          }, 0);
        }
      }, function(errorObject) {
        console.log("Error: ", errorObject.code);
        $scope.UI.alerts.general.push({ type: 'danger', msg: 'There was an error pulling user info.' });
      });
    }

    // Pull down logged in user's deck info (all decks)
    function pullUserDecks(userId) {
      //console.log("Pull decks for ", userId);
      $scope.UI.showLoadingDecks = true;
      var userDecksRef = usersRef.child(userId).child('decks');
      //console.log(userDecksRef.val());
      userDecksRef.on('child_added', function(snapshot) {     
        // If the first deck child has been pulled, will set firstDeckPulled bool to true (tracker)
        $scope.firstDeckPulled ? null : $scope.firstDeckPulled = true;
        // Once user deckID pulled, can remove bool that displays loading spinner
        $scope.UI.showLoadingDecks = false;

        // Pull deck info for each deck   
        decksRef.child(snapshot.key()).once('value', function(snapshot) {
          // Deck metadata
          var deck = snapshot.val();
          // Add array to each deck object to hold posts
          deck.posts = [];
          // Add field to track whether deck posts have been loaded 
          deck.loaded = false;
          // Add deck info to scope array holding decks
          $timeout(function() { 
            $scope.decks.unshift(deck); 
          }, 0);
        });
      }, function(errorObj) {
        console.log("Error: ", errorObject.code);
      });

      // If decks not pulled after 10 seconds, remove loading decks notification      
      $timeout(function() {
        $scope.UI.showLoadingDecks ? $scope.UI.showLoadingDecks = false : null;
      }, 10000);
    }

    // Get MomentJS timestamp for posts and replies
    $scope.getTimestamp = function(postDate) {
      return "(" + moment(postDate).fromNow() + ")";
    };

    // Get post or reply HTML and validate
    $scope.getPostHtml = function(post) {
      return $sce.trustAsHtml(post.content);
    };

    // Inserts embed into div basedon type
    $scope.insertEmbed = function(post) {
      // Try this out
      if(post.embed && post.embed.exists) {
        //console.log("Embed exists for: ", post.id);
        // Hack to make sure that widget rendering is not called twice
        if(angular.element('#embed' + post.id).children().length > 0) { 
          return; 
        } else {
          //console.log("Embed: " + post.id);
          switch(post.embed.type) {
            case "twitter":
              angular.element('#embed' + post.id).html('<div align=\"center\">' + post.embed.data.html + '</div>');
              twttr.widgets.load(angular.element('#embed' + post.id)[0]);  
              break;
            case "instagram":
              angular.element('#embed' + post.id).html('<div align=\"center\">' + post.embed.data.html + '</div>');
              instgrm.Embeds.process();
              break;
            default:
              break;
          }
          
          return;
        }
      } else {
        //console.log("No embed exists!");
        return;
      }
    };


    
  }]);