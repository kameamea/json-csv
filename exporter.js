var es     = require('event-stream');
var _      = require("lodash")
var concat = require('concat-stream')

var exporter = function(options) {
  this.options = options || {}
}

exporter.prototype.csvBuffered = function(data, options, done) {
  if (!data) throw new Error("No data provided.")

  if(typeof options == 'function')
  {
    done = options
    options = {}
  }

  es.readArray(data)
    .pipe(this.csv(options))
    .pipe(concat(function(buffer) {
      done(null, buffer)
    }))
}
exporter.prototype.csv = function(options) {
  var writtenHeader = false
  this.options = options || {}
  var self = this;

  return es.through(function write(data) {
    if (!writtenHeader)
    {
      this.emit('data', self.getHeaderRow())
      writtenHeader = true
    }
    this.emit('data', self.getBodyRow(data))
  })
}

exporter.prototype.prepValue = function(arg, forceQuoted) {
  var quoted = forceQuoted || arg.indexOf('"') >= 0 || arg.indexOf(',') >= 0 || arg.indexOf('\n') >= 0
  var result = arg.replace(/\"/g,'""')
  if (quoted)
    result = '"' + result + '"'
  return result
}

exporter.prototype.getHeaderRow = function() {
  var self = this
  var header = _.reduce(this.options.fields, function(line, field) {
    var label = field.label || field.field
    if (line)
      line += ','
    line += self.prepValue(label)
    return line
  }, '', this)
  header += '\r\n'
  return header
}

exporter.prototype.getBodyRow = function(data) {
  var self = this
  var row = _.reduce(this.options.fields, function(line, field) {
    var label = field.label || field.field
    if (line)
      line += ','

    var val = self.getValue(data, field.name)
    if (field.filter) {
      val = field.filter(val)
    }
    if (typeof val !== 'undefined' && val !== null) {
      var quoted = typeof field.quoted !== 'undefined' && field.quoted
      line += self.prepValue(val.toString(), quoted)
    }
    return line
  }, '', this)

  row += '\r\n'
  return row
}

exporter.prototype.getValue = function(data, arg) {
  var args = arg.split('.')
  if (args.length > 0)
    return this.getValueIx(data, args, 0)
  return data[args[0]];
}

exporter.prototype.getValueIx = function(data, args, ix) {
  var val = data[args[ix]]
  if (typeof val === 'undefined')
    return ''

  if ((args.length-1) > ix)
    return this.getValueIx(val, args, ix+1);

  return val;
}

module.exports = exporter
