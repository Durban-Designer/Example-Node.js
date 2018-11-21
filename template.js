var mongoose = require("mongoose");
var TemplateSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
})

var Template = mongoose.model("Template", TemplateSchema);

module.exports = Template;
