var mongoose = require("mongoose");
var DepartmentSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
})

var Department = mongoose.model("Department", DepartmentSchema);
module.exports = Department;
