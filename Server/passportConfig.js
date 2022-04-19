const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const bodyParser = require('body-parser');
const express = require ("express");
const app = express()
app.use(express.urlencoded({ extended: false }));
/*
const crypto = require ("crypto"); // Cifrar email
const algorithm = "aes-256-cbc"; 
const initVector = crypto.randomBytes(16);
const Securitykey = crypto.randomBytes(32);
*/

function initialize(passport) {
  
    const authenticateUser = (email, password, done) => {

        /*const cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
        let encryptedEmail = cipher.update(email, "utf-8", "hex");
        encryptedEmail += cipher.final("hex");
        console.log("E-mail encriptado: " + encryptedEmail);*/

        /*const decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector);
        let decryptedEmail = decipher.update(encryptedEmail, "hex", "utf-8");
        decryptedEmail += decipher.final("utf8");
        console.log("Decrypted message: " + decryptedEmail);*/

      pool.query(
        "select * from users where user_email = $1",[email],(err, results) => {
            if (err) {
                throw err;
            }
            console.log(results.rows);
  
            if (results.rows.length > 0) {
                const user = results.rows[0];
  
                bcrypt.compare(password, user.user_password, (err, isMatch) => {
                    if (err) {
                        console.log(err);
                    }
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, { message: "Senha incorreta"});
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
};

passport.use(
    new LocalStrategy(
        {   usernameField: "email",
            passwordField: "password" 
        },
        authenticateUser
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