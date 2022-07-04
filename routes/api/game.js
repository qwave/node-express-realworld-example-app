var router = require("express").Router();
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Game = mongoose.model("Game");
var auth = require("../auth");
const Words = require('../../constants/wordlist');
const dateFns = require('date-fns');

const gameStartDate = '2022-07-04';

router.get('/candemo', auth.required, function (req, res, next) {
    User.findById(req.payload.id)
        .then(function (user) {
            if (!user) {
                return res.sendStatus(401);
            }

            return Game.findOne({
                user: user
            }).then(function (game) {
                if (!game) {
                    return res.sendStatus(200);
                }

                return res.sendStatus(400);
            })
        })
        .catch(next);
})

router.post("/start", auth.required, function (req, res, next) {
    User.findById(req.payload.id)
        .then(function (user) {
            if (!user) {
                return res.sendStatus(401);
            }

            const gsd = dateFns.parseISO(gameStartDate)
            let currentTimestamp = new Date()

            let maxGamesPerDay;
            if (dateFns.differenceInDays(gsd, currentTimestamp) === 0) {
                maxGamesPerDay = 1;
            } else if (dateFns.differenceInDays(currentTimestamp, gsd) === 1) {
                maxGamesPerDay = 2;
            } else if (dateFns.differenceInDays(currentTimestamp, gsd) > 1) {
                maxGamesPerDay = 3;
            }
            if (currentTimestamp.getHours() < 6)
                currentTimestamp = dateFns.addDays(currentTimestamp, -1);

            const todayStart = new Date(currentTimestamp.setHours(6, 0, 0, 0)); // 7am msk
            const tomorrowStart = dateFns.addDays(new Date(new Date().setHours(6, 0, 0, 0)), 1);
            return Game.find({
                start: {
                    $gte: todayStart,
                    $lt: tomorrowStart,
                },
            })
                .sort({start: -1})
                .then((games) => {
                    let game;
                    if (!games || !games.length) {
                        game = new Game();
                        game.user = user.id;
                        game.solution = Words[Math.floor(Math.random() * Words.length)];
                        game.attempts = [];
                        game.status = 1;
                        game.demo = false;
                        game.start = new Date();

                        return game.save().then(function () {
                            return res.json({id: game.id, time: game.start, status: game.status, solution: game.solution});
                        });
                    }

                    game = games[0];
                    // game finished
                    console.log(dateFns.differenceInDays(game.start, currentTimestamp));
                    if (game.status > 1 && games.length < maxGamesPerDay) {
                        game = new Game();
                        game.user = user.id;
                        game.solution = Words[Math.floor(Math.random() * Words.length)];
                        game.attempts = [];
                        game.status = 1;
                        game.demo = false;
                        game.start = new Date();

                        return game.save().then(function () {
                            return res.json({id: game.id, time: game.start, status: game.status, solution: game.solution});
                        });
                    } else if (game.status === 1) {
                        return res.json({id: game.id, time: game.start, status: game.status, attempts: game.attempts, solution: game.solution });
                    }

                    return res.sendStatus(400); // max games per day exceeded
                });
        })
        .catch(next);
});

router.post('/attempt', auth.required, function (req, res, next) {
    User.findById(req.payload.id)
        .then(function (user) {
            if (!user) {
                return res.sendStatus(401);
            }
            
            let currentTimestamp = new Date()
            if (currentTimestamp.getHours() < 6)
            currentTimestamp = dateFns.addDays(currentTimestamp, -1);
            const todayStart = new Date(currentTimestamp.setHours(6, 0, 0, 0)); // 7am msk
            const tomorrowStart = dateFns.addDays(new Date(currentTimestamp.setHours(6, 0, 0, 0)), 1);
            return Game.findOne({
                start: {
                    $gte: todayStart,
                    $lt: tomorrowStart,
                },
                status: 1,
            })
                .sort({start: -1})
                .then((game) => {
                    console.log(game)
                    if (!game || game.status !== 1) {
                        return res.sendStatus(400);
                    }

                    game.attempts = game.attempts.concat([{guess: req.body.word, timestamp: new Date(),}])
                    if (game.solution === req.body.word.toLowerCase()) {
                        game.status = 3;
                        game.end = new Date();
                    } else {
                        if (game.attempts.length === 6) {
                            game.status = 2;
                            game.end = new Date();
                        } else {
                            game.status = 1;
                        }
                    }

                    return game.save().then(function () {
                        return res.json({id: game.id, status: game.status, attempts: game.attempts,});
                    });
                });
        }).catch(next);
});

module.exports = router;
