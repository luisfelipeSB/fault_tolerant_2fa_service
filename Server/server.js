const express = require ("express");
const app = express()
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt"); //Hash password
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
/*
const crypto = require ("crypto"); // Cifrar email
const algorithm = "aes-256-cbc"; 
const initVector = crypto.randomBytes(16);
const Securitykey = crypto.randomBytes(32);
*/

const authenticator = require('otplib');
const totp = require('otplib');


const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 3000;

//middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(
    session({
      // Key we want to keep secret which will encrypt all of our information
      secret: "secret", //mudar depois a scret
      // Should we resave our session variables if nothing has changes which we dont
      resave: false,
      // Save empty value if there is no vaue which we do not want to do
      saveUninitialized: false
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/users/register", checkAuthenticated, (req, res) => {
    res.render("register");
});

app.get("/users/token", (req, res) => {
    res.render("token");
});

app.get("/users/secret", (req, res) => {
    res.render("secret");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
    res.render("login");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
    res.render("dashboard", { user: req.user.user_name});
});

app.get("/users/logout", (req, res) => {
    req.logOut();
    req.flash("success_msg","Desconectou-se com sucesso");
    res.redirect("/users/login");
});

app.post("/users/register", async (req, res) => {
    let {name,email,password,password2} = req.body;

    console.log({name,email,password,password2});

    let errors = [];

    if(!name || !password || !email || !password2) {
        errors.push({message:"Preencha todos os campos"});
    }

    if(password.length < 6) {
        errors.push({message:"A password deve ter pelo menos 6 caracteres"});
    }

    if(password != password2) {
        errors.push({message:"As passwords não coincidem"});
    }

    if(errors.length > 0) {
        res.render("register", {errors});
    } else {
        // Ou seja, tudo ok
        let hashedPassword = await bcrypt.hash(password,10);
        console.log(hashedPassword);

        pool.query(
            "select * from users "+
            "where user_email = $1",[email],(err, results) => {
                if(err) {
                    throw err
                }
                console.log(results.rows);
                if(results.rows.length > 0) {
                    errors.push({message:"E-mail já registado"})
                    res.render("register", { errors });
                } else {//Não há email, pode prosseguir

                    /*const cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
                    let encryptedEmail = cipher.update(email, "utf-8", "hex");
                    encryptedEmail += cipher.final("hex");
                    console.log("E-mail encriptado: " + encryptedEmail);*/

                    let secret = authenticator.authenticator.generateSecret();
                    console.log(secret);
                    let token = totp.totp.generate(secret);
                    console.log(token);
                    /*let isValid = totp.totp.check(token, secret);
                    console.log(isValid);*/

                    pool.query(
                        "insert into users (user_name, user_email, user_password, user_secret, user_token, user_check) values ($1, $2, $3, $4, $5, $6) "+
                        "returning user_id, user_password",[name,email,hashedPassword,secret,token,false], (err,results) => {
                            if(err) {
                                throw err
                            }
                            console.log(results.rows);
                            req.flash("secret",secret);
                            res.redirect("/users/secret");
                        }
                    );
                }
            }
        )
    }

});


app.post("/users/login", passport.authenticate("local", {
    successRedirect: "/users/token",
    failureRedirect: "/users/login",
    failureFlash: true
    })
);

function checkAuthenticated(req,res,next) {
    if (req.isAuthenticated()) {
        return res.redirect("/users/dashboard");
    }
    next();
}

function checkNotAuthenticated(req,res,next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/users/login");
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


//-------------------------- TOTP SERVER ------------------------------//

var totpRouter = require('./routes/totpRoutes');

app.use('/api/totp', totpRouter);

var cronJob = require("cron").CronJob;
const axios = require('axios');

new cronJob("*/30 * * * * *", function() {
    console.log("REFRESH TOKENS");

    axios.put('http://localhost:3000/api/totp/updatetokens', {
    todo: 'REFRESH TOKENS'
  })
  .then(res => {
    /*console.log(`statusCode: ${res.status}`)*/
    /*console.log(res)*/
  })
  .catch(error => {
    console.error(error)
  })

}, null, true);