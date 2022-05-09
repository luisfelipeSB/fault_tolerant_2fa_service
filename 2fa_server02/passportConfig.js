const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const express = require ("express");
const app = express()
app.use(express.urlencoded({ extended: false }));
var CryptoJS = require("crypto-js");

function initialize(passport) {
  
    const authenticateUser = (email, password, done) => {
        // not needed because of the callback
};

passport.use(
    new LocalStrategy(
        {   usernameField: "email",
            passwordField: "password",
            passReqToCallback: true
        },
        function (req, email, password, done) {
            {
                email = req.body.email;
                password = req.body.password;
                var token = req.body.token;
                
                pool.query(
                    "select * from users where user_email = $1",[email],(err, results) => {
                        if (err) {
                            throw err;
                        }
                        console.log(results.rows);
              
                        if (results.rows.length > 0) {
                            const user = results.rows[0];

                            //decrypted token
                            var tokenraw = CryptoJS.enc.Base64.parse(user.user_token);
                            var tokenkeyraw = CryptoJS.enc.Base64.parse(user.user_tokenkey);
                            var tokenivraw = CryptoJS.enc.Base64.parse(user.user_tokeniv);

                            var plaintextData = CryptoJS.AES.decrypt(
                             { ciphertext: tokenraw },
                             tokenkeyraw,
                             { iv: tokenivraw });
                             var plaintext = plaintextData.toString(CryptoJS.enc.Latin1);
                             console.log(plaintext);
              
                            bcrypt.compare(password, user.user_password, (err, isMatch) => {
                                if (err) {
                                    console.log(err);
                                }
                                if (isMatch && token == plaintext) {
                                    return done(null, user);
                                } else {
                                    return done(null, false, { message: "Senha ou token incorreto"});
                                }
                            });
                        } else {
                            // Não existe user
                            return done(null, false, {
                                message: "Esse e-mail não está registado"
                            });
                        }
                    }
                );
            }
        }
    )
);

passport.serializeUser((user, done) => done(null, user.user_id));

passport.deserializeUser((user_id, done) => {
    pool.query("select * from users where user_id = $1", [user_id], (err, results) => {
        if (err) {
            return done(err);
        }
        return done(null, results.rows[0]);
        });
    });
}


module.exports = initialize;