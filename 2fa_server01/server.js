const express = require ("express");
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcryptjs"); //Hash password
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");

var CryptoJS = require("crypto-js");

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
      secret: "2fa", //mudar depois a scret
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
                } else {
                //Não há email, pode prosseguir

                    let secret = authenticator.authenticator.generateSecret();
                    console.log(secret);
                    let token = totp.totp.generate(secret);
                    console.log(token);

                    var JsonFormatter = {
                        stringify: function(cipherParams) {
                          // create json object with ciphertext
                          var jsonObj = { ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64) };
                      
                          // optionally add iv or salt
                          if (cipherParams.iv) {
                            jsonObj.iv = cipherParams.iv.toString();
                          }
                      
                          // stringify json object
                          return JSON.stringify(jsonObj);
                        },
                        parse: function(jsonStr) {
                          // parse json string
                          var jsonObj = JSON.parse(jsonStr);
                      
                          // extract ciphertext from json object, and create cipher params object
                          var cipherParams = CryptoJS.lib.CipherParams.create({
                            ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
                          });
                      
                          // optionally extract iv or salt
                      
                          if (jsonObj.iv) {
                            cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
                          }
                      
                          return cipherParams;
                        }
                      };
                      
                      var encrypted = CryptoJS.AES.encrypt(token,"secret", {
                        format: JsonFormatter
                      });
                      var decrypted = CryptoJS.AES.decrypt(encrypted,"secret", {
                        format: JsonFormatter
                      });
                      decrypted.toString(CryptoJS.enc.Utf8);
                        console.log(token);
                          console.log( {
                          "key": CryptoJS.enc.Base64.stringify(encrypted.key),
                          "iv": CryptoJS.enc.Base64.stringify(encrypted.iv),
                          "encrypted": CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
                          "decrypted": decrypted.toString(CryptoJS.enc.Utf8),
                        });

                    pool.query(
                        "insert into users (user_name, user_email, user_password, user_secret, user_token, user_tokenkey, user_tokeniv, user_check) values ($1, $2, $3, $4, $5, $6, $7, $8) "+
                        "returning user_id, user_password",[name,email,hashedPassword,secret,CryptoJS.enc.Base64.stringify(encrypted.ciphertext),CryptoJS.enc.Base64.stringify(encrypted.key),CryptoJS.enc.Base64.stringify(encrypted.iv),false], (err,results) => {
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

app.get("/users/logout", (req, res) => {
    req.logOut();
    req.flash("success_msg","Desconectou-se com sucesso");
    res.redirect("/users/login");
});

app.post("/users/login", passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
    }), (req, res) => {
        req.flash("error",message);
    }
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

//receber param
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var totpRouter = require('./routes/totpRoutes');

app.use('/api/totp', totpRouter);

var cronJob = require("cron").CronJob;
const axios = require('axios');


new cronJob("*/30 * * * * *", function() {
    console.log("REFRESH TOKENS");

    axios.put('http://twofaserver01.westeurope.cloudapp.azure.com/api/totp/updatetokens', {
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
