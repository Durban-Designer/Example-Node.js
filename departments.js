var express = require("express");
var mongodb = require("mongodb");
var _ = require("lodash");
var bodyParser = require("body-parser");
var app = express();
var router = express.Router();
var mongoose = require("mongoose");
var Department = mongoose.model("Department");
var passport = require("passport");
var passportJWT = require("passport-jwt");
var jwt = require('jsonwebtoken');
var User = mongoose.model("User");
var bcrypt = require('bcryptjs');
var Validate = require('./validate.js');
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var Validate = require('./validate.js');

var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("JWT");
jwtOptions.secretOrKey = 'The-Secret-Gets-Changed';

var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  User.findOne({"_id": jwt_payload.id}, function(err, user) {
    if (err) {
      return next(err, false);
    }
    if (user) {
      return next(null, user);
    } else {
      return next(null, false);
    }
  });
});

app.use(passport.initialize());
passport.use(strategy);
app.use(bodyParser.json());

// create a department
router.post("/", passport.authenticate('jwt', { session: false }), (req,res) => {
  function createDepartment () {
    var newDepartment = new Department({
      companyId: req.body.companyId,
      name: req.body.name
    })

    newDepartment.save((err, result) => {
      if(err) {
        res.send(err);
      } else {
        res.send(result);
      }
    });
  }
  Validate.permissions(req.body.adminId, function(result) {
    Validate.log({
      method: 'post',
      object: 'department',
      endpoint: '/',
      time: new Date(),
      adminId: req.body.adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin') {
          createDepartment()
        } else if (result.permissions === 'admin' && req.body.companyId === result.user.companyId) {
          createDepartment()
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/all/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var adminId = req.params["adminId"];
  function sendDepartments () {
    Department.find(function (err, departments) {
      if (err) {
        res.send(err);
      } else {
        res.send(departments);
      }
    })
  }
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'department',
      endpoint: '/all/:adminId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin') {
          sendDepartments()
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/:adminId/:departmentId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var adminId = req.params["adminId"];
  var departmentId = req.params["departmentId"];
  Department.findOne({"_id": departmentId},function (err, department) {
    function sendDepartment () {
      if (err) {
        res.send(err);
      } else {
        res.send(department);
      }
    }
    Validate.permissions(adminId, function(result) {
      Validate.log({
        method: 'get',
        object: 'department',
        endpoint: '/:adminId/:departmentId',
        time: new Date(),
        adminId: adminId,
        ip: req.connection.remoteAddress
      }, function(log, err) {
        if (err) {
          res.status(500).send('Error logging attempt')
        } else {
          if (result.permissions === 'systemAdmin') {
            sendDepartment()
          } else if (result.permissions === 'admin' && department.companyId === result.user.companyId) {
            sendDepartment()
          } else if (result.permissions === 'departmentAdmin' && departmentId === result.user.department) {
            sendDepartment()
          } else {
            res.status(401).send('unauthorized');
          }
        }
      })
    })
  })
})

router.get("/all/:adminId/:companyId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var adminId = req.params["adminId"];
  var companyId = req.params["companyId"];
  function sendDepartments () {
    Department.find({"companyId": companyId}, function (err, departments) {
      if (err) {
        res.send(err);
      } else {
        res.send(departments);
      }
    })
  }
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'department',
      endpoint: '/all/:adminId/:companyId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin') {
          sendDepartments()
        } else if (result.permissions === 'admin' && companyId === result.user.companyId) {
          sendDepartments()
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.put("/:departmentId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var departmentId = req.params["departmentId"];
  function updateDepartment () {
    Department.findOne({"_id": departmentId},function (err, department) {
      if (err) {
        res.status(500).send(err);
      } else if (department == null) {
        res.status(404).send('Department Not Found');
      } else {
        department.companyId = req.body.companyId || department.companyId;
        department.name = req.body.name || department.name;
        department.save(function (err, department) {
          if (err) {
            res.status(500).send(err)
          }
          res.send(department);
        });
      }
    });
  }
  Validate.permissions(req.body.adminId, function(result) {
    Validate.log({
      method: 'put',
      object: 'department',
      endpoint: ':departmentId',
      time: new Date(),
      adminId: req.body.adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin') {
          updateDepartment()
        } else if (result.permissions === 'admin' && req.body.companyId === result.user.companyId) {
          updateDepartment()
        } else if (result.permissions === 'departmentAdmin' && departmentId === result.user.department) {
          updateDepartment()
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.delete("/:id/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var adminId = req.params["adminId"];
  var departmentId = new mongodb.ObjectID(req.params["id"]);
  function deleteDepartment () {
    Department.findOne({_id: departmentId}).remove().then(() => {
      res.send("success");
    })
  }
  Department.findOne({_id: departmentId}, function (err, department) {
    Validate.permissions(adminId, function(result) {
      Validate.log({
        method: 'delete',
        object: 'department',
        endpoint: '/:id/:adminId',
        time: new Date(),
        adminId: adminId,
        ip: req.connection.remoteAddress
      }, function(log, err) {
        if (err) {
          res.status(500).send('Error logging attempt')
        } else {
          if (result.permissions === 'systemAdmin') {
            deleteDepartment()
          } else if (result.permissions === 'admin' && department.companyId === result.user.companyId) {
            deleteDepartment()
          } else {
            res.status(401).send('unauthorized');
          }
        }
      })
    })
  })
})

module.exports = router;
