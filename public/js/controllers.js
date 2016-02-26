'use strict';

// Angular controllers for FireSlides app
angular.module('FireSlides.controllers', []).
  controller('MainController', ['$scope', '$timeout', function($scope, $timeout) {  

    // Logged in user info
    $scope.user = {};
    $scope.loggedIn = false;

    // User deck info    
    $scope.decks = [];

    // Bool for tracking when first deck has been pulled from Firebase
    $scope.firstDeckPulled = false;

    // Reference to currently loaded deck in decks array
    $scope.currentDeck = null;
    
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
      showReplyBox: {},
      alerts: {
        general: [],
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

/*
    $scope.createUser = function() {
      firebaseRef.createUser({
        email    : "bobtony@firebase.com",
        password : "correcthorsebatterystaple"
      }, function(error, userData) {
        if (error) {
          console.log("Error creating user:", error);
        } else {
          console.log("Successfully created user account with uid:", userData.uid);
        }
      });
    };

    $scope.getUser = function() { 
      firebaseRef.authWithPassword({
        email    : "bobtony@firebase.com",
        password : "correcthorsebatterystaple"
      }, function(error, authData) {
        if (error) {
          console.log("Login Failed!", error);
        } else {
          console.log("Authenticated successfully with payload:", authData);
        }
      });
    };
*/
    // On button click, login using Firebase
    $scope.login = function(provider) {
      $scope.UI.showLoggingIn = true;
      switch(provider) {
        case "Google":
          firebaseRef.authWithOAuthRedirect("google", function(error, authData) {
            if (error) {
              $scope.UI.showLoggingIn = false;
              console.log("Login Failed!", error);      
              $scope.UI.alerts.general.push({ type: 'warning', msg: 'Login failed!' });
            } 
          }, { remember: 'sessionOnly', scope: 'email' });
          break;
        case "Twitter":
          firebaseRef.authWithOAuthRedirect("twitter", function(error, authData) {
            if (error) {
              $scope.UI.showLoggingIn = false;
              console.log("Login Failed!", error);      
              $scope.UI.alerts.general.push({ type: 'warning', msg: 'Login failed!' });
            } 
          });
          break;
        default:
          break;
      }



    };
    // On button click, logout or unauth
    $scope.logout = function() { 
      firebaseRef.unauth(); 
      $scope.decks = [];
      $scope.currentDeck = null;
      $scope.user = {};
      $scope.UI.showProfile = false;
      $scope.UI.showNewDeckOptions = false;      
      $scope.UI.alerts.general.push({ type: 'info', msg: 'You have successfully logged out.' });
    };
    // On auth, do various things, including populate user data and pull user decks
    
    firebaseRef.onAuth(function(authData) {
      if(authData) {
        console.log("User " + authData.uid + " is logged in with " + authData.provider);        
        $timeout(function() {
            $scope.loggedIn = true;
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
            }

            // Log in alert that automatically disappears after 5 seconds
            var indexOfNewAlert = $scope.UI.alerts.general.length - 1;            
            $scope.UI.alerts.general.push({ type: 'success', msg: 'You are logged in as:  ' + $scope.user.name + ' (' + $scope.user.provider + ')' });
            $timeout(function() { $scope.closeGeneralAlert(indexOfNewAlert); }, 5000);           

            // Create new Firebase user using transaction if certain user info does not already exist; otherwise, just pull decks
            usersRef.child($scope.user.userId).transaction(function(current_val) {
              // If user properties not set, then set them
              if (!current_val || !current_val.id || !current_val.name || !current_val.email || !current_val.joined) {
                return {
                  id: $scope.user.userId,
                  joined: Firebase.ServerValue.TIMESTAMP,   

                  // CHANGES BASED ON PROVIDER
                  name: $scope.user.name,
                  email: $scope.user.email || "n/a"

                };
                pullUserInfo($scope.user.userId);
                pullUserDecks($scope.user.userId);
              } else {
                pullUserInfo($scope.user.userId);
                pullUserDecks($scope.user.userId);
              }
            }, function(error, committed, snapshot) {
              if(error) { console.log("Error authenticating: ", error); }
            });
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
        var textarea = angular.element('#post_' + deckID);
        var content = textarea.val();

        // Validate text so that no white space
        if(content && !(content.replace(/^\s+|\s+$/gm,'').length == 0)) {
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
            date: Firebase.ServerValue.TIMESTAMP
          };

          newPostRef.set(newPost, function(error) {
            if(!error) {
              console.log("New post created: ", newPostRef.key());
              var newPostID = newPostRef.key().toString();               
              $timeout(function() { textarea.val('') }, 0);
            } else {
              $scope.UI.alerts.postAlerts.push({ type: 'danger', msg: 'Error adding post.'});
            }
          });
        } else {
          console.log("You haven't entered anything to post!");
          $scope.UI.alerts.postAlerts.push({ type: 'warning', msg: 'You haven\'t entered anything to post.'});
        }
      } else {
        console.log("Can't post unless user is logged in.");
        $scope.UI.alerts.postAlerts.push({ type: 'warning', msg: 'Can\'t post unless user is logged in.'});
      }
    };

    $scope.showReplyBox = function(postID) {
      $scope.UI.showReplyBox[postID] ? $scope.UI.showReplyBox[postID] = false : $scope.UI.showReplyBox[postID] = true;
    };

    // On click, hides and unhides text area for creating new reply (tied to particular post)
    $scope.postReply = function(deckID, postID) {
      // Create or clear reply alerts array
      $scope.UI.alerts.replyAlerts[postID] = [];
      if($scope.user.userId && $scope.loggedIn) {
        console.log("New reply . . . ");
        var textarea = angular.element('#reply_' + postID);
        var content = textarea.val();
        // Validate text so no white space
        if(content && !(content.replace(/^\s+|\s+$/gm,'').length == 0)) {
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
            date: Firebase.ServerValue.TIMESTAMP
          };
          newReplyRef.set(newReply, function(error) {
            if(!error) {
              //console.log("Reply added to post: ", newReplyRef.key());
              $timeout(function() { 
                textarea.val('');
                $scope.showReplyBox(postID); 
              }, 0);
            }
          });
        } else {
          console.log("You haven't entered anything to post as a reply!");
          $scope.UI.alerts.replyAlerts[postID].push({ type: 'warning', msg: 'You haven\'t entered anything to post as a reply.'});
        }
      } else {
        console.log("Can't post unless user is logged in.");
        $scope.UI.alerts.replyAlerts[postID].push({ type: 'warning', msg: 'Can\'t post reply unless user is logged in.'});
      }
    };

    // Changes current deck info so that it references selected deck
    $scope.loadDeck = function(deckIndex) {      
      $scope.UI.showNewDeckOptions = false;
      $scope.UI.showProfile = false;
      $scope.currentDeck = $scope.decks[deckIndex];
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

      // If decks not pulled after 15 seconds, remove logging in signal      
      $timeout(function() {
        $scope.UI.showLoadingDecks ? $scope.UI.showLoadingDecks = false : null;
      }, 15000);

    };

    // Pull down logged in user's profile info
    function pullUserInfo(userId) {
      var userRef = usersRef.child(userId);      
      userRef.once('value', function(snapshot) {
        var info = snapshot.val();
        $scope.user.name = info.name;
        $scope.user.email = info.email;
        $scope.user.joined = info.joined;
      }, function(errorObj) {
        console.log("Error: ", errorObject.code);
      });
    };

    // Get MomentJS timestamp for posts and replies
    $scope.getTimestamp = function(postDate) {
      return "(" + moment(postDate).fromNow() + ")";
    };

    
  }]);