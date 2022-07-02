var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'email',
    passReqToCallback: true
}, function (req, email, password, done) {
    User.findOne({email: email}).then(function (user) {
        if (!user) {
            return done(null, false, {errors: {'email or password': 'is invalid'}});
        }

        return done(null, user);
    }).catch(done);
}));

