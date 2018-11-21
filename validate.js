var mongoose = require("mongoose");
var User = mongoose.model("User");
module.exports = {
  permissions: function (id, callback) {
    User.findOne({"_id": id}, function(err, user) {
      if (user === null) {
        callback({permissions: 'none'})
      } else if (user.systemAdmin === true) {
        callback({permissions: 'systemAdmin', user: user})
      } else if (user.admin === true) {
        callback({permissions: 'admin', user: user})
      } else if (user.departmentAdmin === true) {
        callback({permissions: 'departmentAdmin', user: user})
      } else {
        callback({permissions: 'none'})
      }
    });
  },
  log: function (log, callback) {
    console.log(log);
  }
}
/*
  Example of permissions function usage;
  var adminId = the user ID of the admin making the validation request
  var companyId = the CompanyId associated with the particular action to be validated ex; to modify a user in a company
  var departmentId = the departmentId associated with the particular action to be validated ex; making a shift in a department
    Validate.permissions(adminId, function(result) {
      if (result.permissions === 'systemAdmin') {
        methodToValidateFor()
      } else if (result.permissions === 'admin' && companyId === result.user.companyId) {
        methodToValidateFor()
      } else if (result.permissions === 'departmentAdmin' && departmentId === result.user.department && companyId === result.user.companyId) {
        methodToValidateFor()
      } else {
        res.status(401).send('unauthorized');
      }
    })
*/
