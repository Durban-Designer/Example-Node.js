var express = require("express");
var mongodb = require("mongodb");
var _ = require("lodash");
var bodyParser = require("body-parser");
var passport = require("passport");
var passportJWT = require("passport-jwt");
var jwt = require('jsonwebtoken');
var app = express();
var router = express.Router();
var mongoose = require("mongoose");
var User = mongoose.model("User");
var bcrypt = require('bcryptjs');
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

router.post("/login", (req, res) => {
  User.findOne({"email": req.body.email}, function (err, users) {
    if (err) throw err;
    if (users !== null) {
      bcrypt.compare(req.body.password, users.password, function(err, isMatch) {
        if (err) return (err);
        if (isMatch === true) {
          Validate.log({
            method: 'post',
            object: 'user',
            endpoint: '/login',
            time: new Date(),
            email: req.body.email,
            ip: req.connection.remoteAddress
          }, function(log, err) {
            if (err) {
              res.status(500).send('Error logging attempt')
            } else {
              var payload = {"id": users.id};
              var token = jwt.sign(payload, jwtOptions.secretOrKey);
              res.json({userId: users.id, token: token, companyId: users.companyId, department: users.department, admin: users.admin, systemAdmin: users.systemAdmin, departmentAdmin: users.departmentAdmin});
            }
          })
        } else {
          Validate.log({
            method: 'post',
            object: 'user',
            endpoint: '/login',
            time: new Date(),
            email: req.body.email,
            ip: req.connection.remoteAddress
          }, function(log, err) {
            if (err) {
              res.status(500).send('Error logging attempt')
            } else {
              res.status(401).send('unauthorized');
            }
          })
        }
      })
    } else {
      Validate.log({
        method: 'post',
        object: 'user',
        endpoint: '/login',
        time: new Date(),
        email: req.body.email,
        ip: req.connection.remoteAddress
      }, function(log, err) {
        if (err) {
          res.status(500).send('Error logging attempt')
        } else {
          res.status(401).send('unauthorized');
        }
      })
    }
  })
})

router.post("/recover", (req, res) => {
  function sendRecoveryEmail (user) {
    // todo write email sending logic
    res.send('success')
  }
  User.findOne({"email": req.body.email}, function (err, user) {
    if (err) {
      console.log(err)
    } else {
      Validate.log({
        method: 'post',
        object: 'user',
        endpoint: '/recover',
        time: new Date(),
        email: req.body.email,
        ip: req.connection.remoteAddress
      }, function(log, err) {
        if (err) {
          res.status(500).send('Error logging attempt')
        } else {
          sendRecoveryEmail(user)
        }
      })
    }
  })
})


router.post("/", passport.authenticate('jwt', { session: false }), (req,res) => {
  function createUser (admins) {
    var newUser = new User({
      email: req.body.email,
      password: req.body.password,
      title: req.body.title,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      address: req.body.address,
      phone: req.body.phone,
      department: req.body.department,
      companyId: req.body.companyId,
      departmentAdmin: false,
      admin: false,
      systemAdmin: false
    })
    if (admins.systemAdmin === true) {
      newUser.systemAdmin = req.body.systemAdmin
    }
    if (admins.admin === true) {
      newUser.admin = req.body.admin
    }
    if (admins.departmentAdmin === true) {
      newUser.departmentAdmin = req.body.departmentAdmin
    }

    newUser.save((err, result) => {
      if(err) {
        res.send(err);
      } else {
        User.findOne({"email": req.body.email}, function (err, users) {
          var payload = {"id": users.id};
          var token = jwt.sign(payload, jwtOptions.secretOrKey);
          res.status(201).json({userId: users.id, token: token, companyId: users.companyId, department: users.department, admin: users.admin, systemAdmin: users.systemAdmin, departmentAdmin: users.departmentAdmin});
        })
      }
    })
  }
  if (req.body.adminId === null) {
    res.status(401).send('unauthorized');
  }
  Validate.permissions(req.body.adminId, function(result) {
    Validate.log({
      method: 'post',
      object: 'user',
      endpoint: '/',
      time: new Date(),
      adminId: req.body.adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin') {
          createUser({systemAdmin: true, admin: true, departmentAdmin: true})
        } else if (result.permissions === 'admin' && req.body.companyId === result.user.companyId) {
          createUser({systemAdmin: false, admin: true, departmentAdmin: true})
        } else if (result.permissions === 'departmentAdmin' && req.body.department === result.user.department && req.body.companyId === result.user.companyId) {
          createUser({systemAdmin: false, admin: false, departmentAdmin: true})
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})


router.get("/all/:companyId/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var companyId = req.params["companyId"];
  var adminId = req.params["adminId"];
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'user',
      endpoint: '/all/:companyId/:adminId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === companyId)) {
          User.find({"companyId": companyId},function (err, users) {
            if (err) {
              res.send(err);
            } else {
              res.send(users);
            }
          })
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/department/:department/:companyId/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var companyId = req.params["companyId"];
  var department = req.params["department"];
  var adminId = req.params["adminId"];
  Validate.permissions(adminId, function(result) {
    Validate.log({
      method: 'get',
      object: 'user',
      endpoint: '/department/:department/:companyId/:adminId',
      time: new Date(),
      adminId: adminId,
      ip: req.connection.remoteAddress
    }, function(log, err) {
      if (err) {
        res.status(500).send('Error logging attempt')
      } else {
        if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === companyId && result.user.department === department)) {
          User.find({"companyId": companyId, "department": department},function (err, users) {
            if (err) {
              res.send(err);
            } else {
              res.send(users);
            }
          })
        } else {
          res.status(401).send('unauthorized');
        }
      }
    })
  })
})

router.get("/self/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = req.params["id"];
  Validate.log({
    method: 'get',
    object: 'user',
    endpoint: '/self/:id',
    time: new Date(),
    userid: userid,
    ip: req.connection.remoteAddress
  }, function(log, err) {
    if (err) {
      res.status(500).send('Error logging attempt')
    } else {
      User.findOne({"_id": userid},function (err, users) {
        if (err) {
          res.send(err);
        } else {
          res.send(users);
        }
      })
    }
  })
})

router.get("/search/:adminId/:params/:companyId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var params = req.params["params"];
  var adminId = req.params["adminId"];
  var companyId = req.params["companyId"];
  User.find({"firstName": { "$regex" : params}, "companyId": companyId}, function (err, users) {
    if (err) {
      res.send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'get',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === users.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === users.companyId && result.user.department === users.department)) {
              res.send(users);
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  })
})

router.get("/search/:adminId/:params/:companyId/:departmentId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var params = req.params["params"];
  var adminId = req.params["adminId"];
  var companyId = req.params["companyId"];
  var departmentId = req.params["departmentId"];
  User.find({"firstName": { "$regex" : params}, "department": departmentId, "companyId": companyId}, function (err, users) {
    if (err) {
      res.send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'get',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === users.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === users.companyId && result.user.department === users.department)) {
              res.send(users);
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  })
})

router.get("/:id/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = req.params["id"];
  var adminId = req.params["adminId"];
  User.findOne({"_id": userid},function (err, user) {
    if (err) {
      res.send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'get',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === users.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === users.companyId && result.user.department === users.department)) {
              res.send(user);
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  })
})

router.put("/self/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = new mongodb.ObjectID(req.params["id"]);
  User.find({"_id": userid},function (err, user) {
    if (err) {
        res.status(500).send(err);
    } else {
      var user = user[0];
      user.email = req.body.email || user.email;
      user.password = req.body.password || user.password;
      user.title = req.body.title || user.title;
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.address = req.body.address || user.address;
      user.phone = req.body.phone || user.phone;
      user.role = req.body.role || user.role;
      user.department = req.body.department || user.department;
      user.companyId = req.body.companyId || user.companyId;
      user.departmentAdmin = req.body.departmentAdmin || user.departmentAdmin;
      user.admin = req.body.admin || user.admin;
      user.systemAdmin = req.body.systemAdmin || user.systemAdmin;
      user.save(function (err, user) {
          if (err) {
            res.status(500).send(err)
          }
          res.send(user);
      });
    }
  })
})

router.delete("/:id/:adminId", passport.authenticate('jwt', { session: false }), (req, res) => {
  var userid = new mongodb.ObjectID(req.params["id"]);
  var adminId = req.params["adminId"];
  User.find({"_id": userid},function (err, user) {
    if (err) {
        res.status(500).send(err);
    } else {
      Validate.permissions(adminId, function(result) {
        Validate.log({
          method: 'delete',
          object: 'user',
          endpoint: '/:id/:adminId',
          time: new Date(),
          adminId: adminId,
          ip: req.connection.remoteAddress
        }, function(log, err) {
          if (err) {
            res.status(500).send('Error logging attempt')
          } else {
            if (result.permissions === 'systemAdmin' || (result.permissions === 'admin' && result.user.companyId === user.companyId) || (result.permissions === 'departmentAdmin' && result.user.companyId === user.companyId && result.user.department === user.department)) {
              User.find({"_id": userid}).remove().then(() => {
                res.send("success");
              })
            } else {
              res.status(401).send('unauthorized');
            }
          }
        })
      })
    }
  });
})

module.exports = router;
