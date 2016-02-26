var express = require('express');


var express = require('express')
  , fs      = require('fs')
  , http    = require('http')
  , https   = require('https')
  , path	= require('path')
  , url 	= require('url')
  , ejs     = require('ejs')   
  , expressValidator = require('express-validator')
  //, flash 	= require('connect-flash')
  , morgan 	= require('morgan') // replaces 'logger' in Express 4.0
  , compression = require('compression')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  //, cookieParser = require('cookie-parser')
  //, session = require('express-session')
  , csurf 	= require('csurf')
  , embedRoutes = require('./routes/embeds');


// Instantiate Express
var app = express();

app.set('port', (process.env.PORT || 5000));

// Ejs templates in Views folder
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(morgan('dev'));
app.use(compression());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.use(expressValidator());  
app.use(methodOverride());

// Routes
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html' );
});
app.use('/embeds', embedRoutes);


app.use(express.static(path.join(__dirname, 'public')));


app.use(function(req, res, next){
  res.status(404).send('Sorry, that doesn\'t exist!')
});
app.use(function(err, req, res, next){
  console.error(err.stack);
  if (req.xhr) {
    res.status(500).send('Something blew up!');
  } else {
    res.status(500).send('Something blew up!');
  }
});


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});