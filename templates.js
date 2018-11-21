var express = require("express");
var mongodb = require("mongodb");
var _ = require("lodash");
var bodyParser = require("body-parser");
var passport = require("passport");
var passportJWT = require("passport-jwt");
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var app = express();
var router = express.Router();
var mongoose = require("mongoose");
var Template = mongoose.model("Template");
var User = mongoose.model("User");
var bcrypt = require('bcryptjs');
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var Validate = require('./validate.js');
var recordsPerPage = 8;

var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("JWT");
jwtOptions.secretOrKey = 'Weigh-Secret-2018-no1';

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

router.post("/", (req,res) => {
  var newTemplate = new Template({
    company: req.body.company,
    sender: req.body.sender,
    subject: req.body.subject,
    text: req.body.text,
    html: req.body.html,
    name: req.body.name
  })

  newTemplate.save((err, result) => {
    if(err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
})

router.post("/send/:id", (req,res) => {
  // create reusable transporter object using the default SMTP transport
  var transporter = nodemailer.createTransport({
    host: 'smtp.office365.com', // Office 365 server
    port: 587,     // secure SMTP
    ignoreTLS: false,
    requireTLS: true,
    auth: {
      user: '',
      pass: ''
    },
    tls: {
      ciphers: 'SSLv3'
    }
  });

  var templateid = new mongodb.ObjectID(req.params["id"]);
  Template.findOne({"_id": templateid},function (err, template) {
    if (err) {
      res.send(err);
    } else {
      let i = 0
      var textBody = eval('`' + template.text + '`');
      var htmlBody = eval('`' + template.html + '<br/><a href="https://www.weigh-label.com/unsubscribe/' + req.body.campaignId + '/' + leadArray[i]._id + '">unsubscribe</a>' + '`');
      // setup e-mail data with unicode symbols
      var mailOptions = {
        from: `${template.sender} <>`, // sender address
        to: leadArray[i].email, // list of recipients
        subject: template.subject, // Subject line
        text: textBody, // plaintext body
        html: htmlBody // html body
      };

      // send mail with defined transport object
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          let leadEmail = leadArray[i].email
          console.log(error);
          campaign.log.push({lead: leadArray[i]._id, message: 'sent to ' + leadEmail, time: new Date(), error: true})
        }
      });
    }
  })
})

router.get("/:companyId", passport.authenticate('jwt', { session: false }),(req, res) => {
  var companyId = req.params["companyId"]
  Template.find({"company": companyId},function (err, templates) {
    if (err) {
      res.send(err);
    } else {
      res.send(templates);
    }
  })
})

router.get("/id/:id", passport.authenticate('jwt', { session: false }),(req, res) => {
  try {
    var templateid = new mongodb.ObjectID(req.params["id"]);
  } catch(err) {
    console.log(err)
  };
  Template.find({"_id": templateid},function (err, templates) {
    if (err) {
      res.send(err);
    } else {
      res.send(templates);
    }
  })
})

router.get("/name/:name/:company/:page", passport.authenticate('jwt', { session: false }),(req, res) => {
  var templateName = req.params["name"];
  var pageNum = req.params["page"] || 1;
  var company = req.params["company"];
  Template
  .find({"name": {$regex: '^' + templateName}, "company": company})
  .skip((pageNum - 1) * recordsPerPage)
  .limit(recordsPerPage)
  .exec(function (err, templates) {
    if (err) {
      res.send(err);
    } else {
      res.send(templates);
    }
  })
})

router.put("/:id", passport.authenticate('jwt', { session: false }),(req, res) => {
  var templateid = new mongodb.ObjectID(req.params["id"]);
  Template.find({"_id": templateid},function (err, template) {
    if (err) {
        res.status(500).send(err);
    } else {
        var template = template[0];
        template.company = req.body.company || template.company;
        template.sender = req.body.sender || template.sender;
        template.subject = req.body.subject || template.subject;
        template.text = req.body.text || template.text;
        template.html = req.body.html || template.html;
        template.name = req.body.name || template.name;

        template.save(function (err, template) {
            if (err) {
                res.status(500).send(err)
            }
            res.send(template);
        });
    }
});
})

router.delete("/:id", passport.authenticate('jwt', { session: false }),(req, res) => {
  var templateid = new mongodb.ObjectID(req.params["id"]);
  Template.find({_id: templateid}).remove().then(() => {
    console.log("success");
    res.send("success");
  })
})

module.exports = router;
