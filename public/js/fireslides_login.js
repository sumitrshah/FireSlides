'use strict';

var FireSlides = angular.module('FireSlidesLogin', [
  'FireSlidesLogin.controllers',
]);

// Angular controllers for FireSlides app
angular.module('FireSlidesLogin.controllers', []).
  controller('LoginController', ['$scope', '$timeout', '$window', function($scope, $timeout, $window) {  

  	$scope.loggedIn = false;

  	// Model variables for email login
  	$scope.user_email = null;
  	$scope.user_password = null;

    // UI elements
    $scope.UI = {
    	showLoggingIn: false,
      alerts: []
    };
    // Function for closing alert boxes
    $scope.closeAlert = function(index) {
      $scope.UI.alerts.splice(index, 1);
    }

    // References to FireSlides firebase DB
    var firebaseRef = new Firebase('https://fireslidesdb.firebaseio.com/');

		// On button click, login using Firebase
	  $scope.login = function(provider) {
	  	console.log("Login with: ", provider);
	  	$scope.UI.showLoggingIn = true;
	  	$scope.UI.alerts = [];
	  	
	    switch(provider) {
	      case "Google":
	      	console.log("Logging in with Google . . .");
	        firebaseRef.authWithOAuthRedirect("google", function(error, authData) {
	          if (error) {
	            $scope.UI.showLoggingIn = false;
	            console.log("Login Failed!", error);      
	            $scope.UI.alerts.push({ type: 'warning', msg: 'Login failed!' });
	          } else {
	          	console.log(authData);
	          }
	        }, { remember: 'sessionOnly', scope: 'email' });
	        break;
	      case "Twitter":
	      	console.log("Logging in with Twitter . . .");
	        firebaseRef.authWithOAuthRedirect("twitter", function(error, authData) {
	          if (error) {
	            $scope.UI.showLoggingIn = false;
	            console.log("Login Failed!", error);      
	            $scope.UI.alerts.push({ type: 'warning', msg: 'Login failed!' });
	          } 
	        }, { remember: 'sessionOnly' });
	        break;
	      case "Email":
	      	console.log("Logging in with email and password . . .");
	      	if(!$scope.user_email || $scope.emailLoginForm.$error.email) {
	      		$scope.UI.alerts.push({ type: 'danger', msg: 'Please enter valid email address.' });
	      		$scope.user_password = "";
	      		$scope.UI.showLoggingIn = false;
	      	} else {
	      		if(!$scope.user_password || ($scope.user_password.replace(/^\s+|\s+$/gm,'').length == 0)) {
	      			$scope.UI.alerts.push({ type: 'danger', msg: 'Please enter valid password.' });
	      			$scope.user_password = "";
	      			$scope.UI.showLoggingIn = false;
	      		} else {
	      			firebaseRef.authWithPassword({
							  email    : $scope.user_email,
							  password : $scope.user_password
							}, function(error, authData) {
							  if (error) {
							    $timeout(function() { 
		                $scope.UI.alerts.push({ type: 'danger', msg: 'Login Failed! ' + error.message });
		                $scope.UI.showLoggingIn = false;
		                $scope.user_email = "";
							  		$scope.user_password = "";
		              }, 0);							    
							  } else {
							    console.log("Authenticated successfully with payload:", authData);
							    $timeout(function() { 
							    	$scope.user_email = "";
							  		$scope.user_password = "";
		              }, 0);	
							  }
							});
	      		}
	      	}
	      	break;
	      default:
	        break;
	    }
	  };

	  // On auth, do various things, including populate user data and pull user decks
    firebaseRef.onAuth(function(authData) {
      if(authData) {
        console.log("User " + authData.uid + " is logged in with " + authData.provider); 
        console.log("Redirecting . . .");
        $scope.UI.alerts.push({ type: 'success', msg: 'Successfully logged in. Redirecting to admin page . . .' });
        $window.location.href = '/admin.html';
      } else {
        console.log("User is not logged in.");
        $scope.loggedIn = false;
      }
    });

  }]);