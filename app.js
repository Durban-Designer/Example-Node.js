// Import dependencies
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require('mongoose');
// Define port to run api server on
var port = 81;
// Define the application and router objects.
var app = express();
var router = express.Router();
// Define the path to any web pages to serve
var path = __dirname + "/views/";
// Bring in Mongoose models
require("./department");
require("./template");
require("./user");
// Bring in Endpoints for objects
var departments = require("./departments");
var templates = require("./templates.js");
var users = require("./users.js");
// Define promise library for mongoose to use as default
mongoose.Promise = global.Promise;
// Connect to remote Mlab database
mongoose.connect("mongodb://admin:123@ds237947.mlab.com:37947/screen-art", {
  useMongoClient: true
}, function (error) {
  console.log(error);
})
// Tell express to use the JSON Body parser middleware
app.use(bodyParser.json());
// Tell express to use static paths to the web pages
app.use(express.static(path));
// Define the router object as express middleware
app.use("/", router);
// Tell the router what endpoint to use for each overall endpoint file
app.use("/departments", departments);
app.use("/templates", templates);
app.use("/users", users);
// Define application CORS to allow standard CRUD operations
router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS')
  next()
})
// Define a basic endpoint to return the index.html, mainly used for getting the https cert.
router.get("/", (req,res) => {
  res.sendFile(path + "index.html");
})
// Tell the express web server to start on the defined port and log a message to console
app.listen(port, () => {
  console.log("Live at Port " + port);
})
// Establish logging where everytime the API is queried it is console logged
router.use( (req,res,next) => {
  console.log("/" + req.method);
  next();
})
// Define 404 page as fallback state
app.use("*", (req,res) => {
  res.sendFile(path + "404.html");
})
