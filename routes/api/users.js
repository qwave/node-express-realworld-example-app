var mongoose = require("mongoose");
var router = require("express").Router();
var passport = require("passport");
var User = mongoose.model("User");
var Game = mongoose.model("Game");
var auth = require("../auth");
const dateFns = require("date-fns");
const gameStartDate = process.env.GAME_START_DATE;

router.get("/user", auth.required, function (req, res, next) {
  User.findById(req.payload.id)
    .then(function (user) {
      if (!user) {
        return res.sendStatus(401);
      }

      return res.json({ user: user.toAuthJSON() });
    })
    .catch(next);
});

router.put("/user", auth.required, function (req, res, next) {
  User.findById(req.payload.id)
    .then(function (user) {
      if (!user) {
        return res.sendStatus(401);
      }

      // only update fields that were actually passed...
      if (typeof req.body.user.username !== "undefined") {
        user.username = req.body.user.username;
      }
      if (typeof req.body.user.email !== "undefined") {
        user.email = req.body.user.email;
      }
      if (typeof req.body.user.bio !== "undefined") {
        user.bio = req.body.user.bio;
      }
      if (typeof req.body.user.image !== "undefined") {
        user.image = req.body.user.image;
      }
      if (typeof req.body.user.password !== "undefined") {
        user.setPassword(req.body.user.password);
      }

      return user.save().then(function () {
        return res.json({ user: user.toAuthJSON() });
      });
    })
    .catch(next);
});

router.post("/users/login", function (req, res, next) {
  if (!req.body.email) {
    return res.status(422).json({ errors: { email: "can't be blank" } });
  }

  passport.authenticate(
    "local",
    { session: false },
    function (err, user, info) {
      if (err) {
        return next(err);
      }

      if (user) {
        user.token = user.generateJWT();
        return res.json({ user: user.toAuthJSON() }).send();
      } else {
        return res.status(422).json(info).send();
      }
    }
  )(req, res, next);
});

router.post("/users/status", auth.required, function (req, res, next) {
  User.findById(req.payload.id)
    .then(function (user) {
      if (!user) {
        return res.sendStatus(401);
      }
      let response = {};
      const gsd = new Date(gameStartDate);
      let currentTimestamp = new Date();

      if (currentTimestamp.getUTCHours() < 4)
        currentTimestamp = dateFns.addDays(currentTimestamp, -1);

      let maxGamesPerDay;
      if (dateFns.differenceInDays(gsd, currentTimestamp) === 0) {
        maxGamesPerDay = 1;
      } else if (dateFns.differenceInDays(currentTimestamp, gsd) === 1) {
        maxGamesPerDay = 2;
      } else if (dateFns.differenceInDays(currentTimestamp, gsd) > 1) {
        maxGamesPerDay = 3;
      }

      const todayStart = new Date(currentTimestamp.setHours(4, 0, 0, 0)); // 7am msk
      const tomorrowStart = dateFns.addDays(
        new Date(new Date().setHours(4, 0, 0, 0)),
        1
      );

      Game.find({
        start: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
        user: user.id
      })
        .sort({ start: -1 })
        .then((games) => {
          response.status = ((!games || !games.length) || games[0].status === 1 || games.length < maxGamesPerDay) ? 0 : 1; // 0 - no game, 1 - has game

          response.day = dateFns.differenceInCalendarDays(
            currentTimestamp,
            gsd
          );
    
          return res.json(response);
        });
    })
    .catch(next);
});

router.post("/users", function (req, res, next) {
  if (!req.body.email) {
    return res.status(422).json({ errors: { email: "can't be blank" } });
  }

  passport.authenticate(
    "local",
    { session: false },
    function (err, user, info) {
      if (err) {
        return next(err);
      }

      if (!user) {
        user = new User();
      }

      user.email = req.body.email;
      user.username = req.body.username;
      user.setPassword(req.body.email);

      user
        .save()
        .then(function () {
          return res.json(user.toAuthJSON());
        })
        .catch(next);
    }
  )(req, res, next);
});

module.exports = router;
