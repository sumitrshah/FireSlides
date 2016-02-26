'use strict';

var FireSlides = angular.module('FireSlidesSignup', [
  'FireSlidesSignup.controllers',
]);

// Angular controllers for FireSlides app
angular.module('FireSlidesSignup.controllers', []).
  controller('SignupController', ['$scope', '$timeout', '$window', function($scope, $timeout, $window) {  

  	// Model variables for email signup
  	$scope.user_email = null;
  	$scope.user_password = null;
  	$scope.user_name = null;

    // UI elements
    $scope.UI = {
    	//showLoggingIn: false,
    	showSigningUp: false,
      alerts: []
    };
    // Function for closing alert boxes
    $scope.closeAlert = function(index) {
      $scope.UI.alerts.splice(index, 1);
    }

    // References to FireSlides firebase DB
    var firebaseRef = new Firebase('https://fireslidesdb.firebaseio.com/');
    var usersRef = firebaseRef.child('users');

    $scope.signup = function() {
    	$scope.UI.showSigningUp = true;
    	$scope.UI.alerts = [];

    	if(!$scope.user_email || $scope.emailLoginForm.$error.email) {
    		$scope.UI.alerts.push({ type: 'danger', msg: 'Please enter valid email address.' });
    		$scope.user_password = "";
    		$scope.UI.showSigningUp = false;
    	} else {
    		if(!$scope.user_password || ($scope.user_password.replace(/^\s+|\s+$/gm,'').length == 0)) {
    			$scope.UI.alerts.push({ type: 'danger', msg: 'Please enter valid password (must be at least 6 characters).' });
    			$scope.user_password = "";
    			$scope.UI.showSigningUp = false;
    		} else {
    			if(!$scope.user_name || ($scope.user_name.replace(/^\s+|\s+$/gm,'').length == 0)) {
    				$scope.UI.alerts.push({ type: 'danger', msg: 'Please enter username.' });
	    			$scope.user_password = "";
	    			$scope.UI.showSigningUp = false;
    			} else {

    				// EMAIL CONFIRMATION? 

    				// Create user
    				firebaseRef.createUser({
			        email    : $scope.user_email,
			        password : $scope.user_password
			      }, function(error, userData) {
			        if (error) {
			        	console.log("Error creating user: ", error);
			        	$timeout(function() { 
	                $scope.UI.alerts.push({ type: 'danger', msg: 'Error: ' + error.message });
	                $scope.user_email = "";
							  	$scope.user_password = "";
							  	$scope.user_name = "";
			          	$scope.UI.showSigningUp = false;
	              }, 0);			          
			        } else {
			        	console.log("Successfully created user account.");
			        	// Login with newly created account credentials
			        	firebaseRef.authWithPassword({
								  email    : $scope.user_email,
								  password : $scope.user_password
								}, function(error, authData) {
								  if (error) {
								  	console.log("Couldn't login and add new user to FireSlides DB.");
								  	console.log("Deleting newly created account . . .");
								  	// Delete newly created account
								  	deleteUser($scope.user_email, $scope.user_password);
								  } else {
								    console.log("Authenticated successfully with payload:", authData);

								    // Add new user info to Users section in DB
								    usersRef.child(userData.uid).transaction(function(current_val) {
					            // If user properties not set, then set them
					            if (!current_val || !current_val.id || !current_val.name || !current_val.email || !current_val.joined) {
					              return {
					                id: userData.uid,
					                joined: Firebase.ServerValue.TIMESTAMP,   			                
					                name: $scope.user_name || "",
					                email: $scope.user_email || ""
					              };
					            }			            
					          }, function(error, committed, snapshot) {
					            if(error) { 
					            	console.log("Error saving user data to DB: ", error); 
					            	deleteUser($scope.user_email, $scope.user_password);
					            } else {
					            	console.log();
					            	$timeout(function() { 
					                $scope.UI.alerts.push({ type: 'success', msg: 'Successfully created user account.' });
					                $scope.user_email = "";
											  	$scope.user_password = "";
											  	$scope.user_name = "";
							          	$scope.UI.showSigningUp = false;
					              }, 0);
					            }
					          });
								  }
								});
			        }
			      });
    			}
    		}
    	}
    };

    function deleteUser(email, password) {
    	firebaseRef.removeUser({
			  email    : email,
			  password : password
			}, function(error) {
			  if (error === null) {
			    console.log("Newly created user removed successfully");
			    $timeout(function() { 
			    	$scope.UI.alerts.push({ type: 'danger', msg: 'Error creating user.' });
            $scope.user_email = "";
				  	$scope.user_password = "";
				  	$scope.user_name = "";
          	$scope.UI.showSigningUp = false;
          }, 0);
			  } else {
			  	console.log("Error deleting newly created user.");
			    $timeout(function() { 
			    	$scope.UI.alerts.push({ type: 'danger', msg: 'Error creating user. Please contact FireSlides admin.' });
            $scope.user_email = "";
				  	$scope.user_password = "";
				  	$scope.user_name = "";
          	$scope.UI.showSigningUp = false;
          }, 0);
			  }
			});	
    }





  }]);