var router = require("express").Router();
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Game = mongoose.model("Game");
var auth = require("../auth");

router.post("/start", auth.required, function (req, res, next) {
  User.findById(req.payload.id)
    .then(function (user) {
      if (!user) {
        return res.sendStatus(401);
      }

      const newGameStartDate = new Date();
      const newGameStartDateTMinuts24 = new Date(
        newGameStartDate.getFullYear(),
        newGameStartDate.getMonth(),
        newGameStartDate.getDate(),

      );
      newGameStartDateTMinuts24.setDate(newGameStartDate.getDate() - 1);

      return Game.findOne({
        time: {
          $gte: newGameStartDateTMinuts24,
        },
      }).then((game) => {
        if (!game) {
          var game = new Game();
          game.solution = "ASD"; // sleect random word
          game.attempts = [];
          game.status = 1;
          game.demo = false;
          game.user = user.id;
          game.time = new Date();
        }

        console.log(game);
        return game.save().then(function () {
          return res.json({ id: game.id, time: game.time, status: game.status });
        });
      });
    })
    .catch(next);
});

module.exports = router;
