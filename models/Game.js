var mongoose = require("mongoose");

var GameSchema = new mongoose.Schema(
    {
        user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
        solution: {type: String, required: [true, "can't be blank"]},
        attempts: [{guess: String, timestamp: Date}],
        status: {type: Number, default: 0},
        demo: {type: Boolean},
        start: {type: Date},
        end: {type: Date},
    },
    {timestamps: true}
);

mongoose.model("Game", GameSchema);
