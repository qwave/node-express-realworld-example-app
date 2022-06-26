var mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");

var GameSchema = new mongoose.Schema(
  {
    solution: { type: String, required: [true, "can't be blank"] },
    attempts: [{ guess: String, timestamp: Date }],
    status: { type: Number, default: 0 },
    demo: { type: Boolean },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    time: { type: Date },
  },
  { timestamps: true }
);

mongoose.model("Game", GameSchema);
