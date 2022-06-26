var mongoose = require('mongoose')

var WordSchema = new mongoose.Schema({
    word: String,
    description: String,
});

WordSchema.methods.toJSON = function(){
    return {
      id: this._id,
      word: this.word,
      description: this.description
    };
};

mongoose.model('Word', WordSchema);