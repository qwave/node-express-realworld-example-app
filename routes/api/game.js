var router = require("express").Router();
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Game = mongoose.model("Game");
var auth = require("../auth");
const Words = require('../../constants/wordlist');
const dateFns = require('date-fns');
const {utcToZonedTime} = require('date-fns-tz')

const gameStartDate = process.env.GAME_START_DATE;

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

router.get('/rating', auth.required, function (req, res, next) {
    User.findById(req.payload.id)
        .then(function (user) {
            if (!user) {
                return res.sendStatus(401);
            }

            return getRanking().then((ranking) => {
                let position = ranking.findIndex(r => {
                    return r.id.toString() === user.id.toString();
                });
                if (position < 10) {
                    let result = ranking.slice(0, 10);
                    if (position >= 0)
                        result[position].position = position;
                    res.send(result);
                }
                else {
                    let result = ranking.slice(0, 9);
                    let userRanking = ranking[position];
                    userRanking.position = position;

                    result.push(userRanking);
                    res.send(result);
                }

            });
        })
        .catch(next);
})

router.post("/start", auth.required, function (req, res, next) {
  //console.log(utcToZonedTime(new Date(), 'Europe/Paris'), new Date());
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
            
            getRanking().then((ranking) => {
                let position = ranking.findIndex(r => {
                    return r.id.toString() === user.id.toString();
                });

                return Game.find({
                    start: {
                        $gte: todayStart,
                        $lt: tomorrowStart,
                    },
                    user: user.id
                }).sort({start: -1}).then((games) => {
                    let game;
                    if (!games || !games.length || (games[0].status > 1 && games.length < maxGamesPerDay)) {
                        game = new Game();
                        game.user = user.id;
                        game.solution = Words[Math.floor(Math.random() * 100)];
                        game.attempts = [];
                        game.status = 1;
                        game.demo = false;
                        game.start = new Date();
                        game.duration = 0;

                        return game.save().then(function () {
                            return res.json({id: game.id, time: game.start, status: game.status, solution: Buffer.from(game.solution).toString('base64'), duration: game.duration, position: position, rankingcount: ranking.length });
                        });
                    }
                    
                    game = games[0];
                    if (game.status === 1) {
                        game.duration = dateFns.differenceInSeconds(new Date(), game.start);
                        console.log(game.duration);
                        return res.json({id: game.id, time: game.start, status: game.status, attempts: game.attempts, solution: Buffer.from(game.solution).toString('base64'), duration: game.duration, position: position, rankingcount: ranking.length });
                    }

                    return res.json({msg: 'no more games today'}); // max games per day exceeded
                });
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

const getRanking = () => {
    return new Promise((resolve, reject) => {
        User.aggregate([{
            $lookup: {
                from: "games", 
                // pipeline: [{ 
                //     $match : {
                //         status: 3,
                //         demo: false
                //     }
                // }],
                localField: "_id",
                foreignField: "user",
                as: "games"
            }
        }]).exec(function(err, users) {
            if (!users) {
                resolve([]);
                return;
            };

            users.map(x =>
                x.games = x.games.filter(g => !g.demo && g.status === 3)
            );
            
            let ranking = users.filter(x => x.games.length > 0).map(user => {
                var gameTimes = user.games.map(game => dateFns.differenceInSeconds(game.end, game.start));
                
                return {
                    id: user._id,
                    name: user.username,
                    wordcount: user.games.length || 0,
                    time: gameTimes.reduce((a, b) => a + b, 0)
                };
            });

            ranking = ranking.sort((a, b) => b.wordcount - a.wordcount || a.time - b.time);

            resolve(ranking);
        });
    })
  }

module.exports = router;
