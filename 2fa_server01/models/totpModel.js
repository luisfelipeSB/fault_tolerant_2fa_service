const { pool } = require("../dbConfig");
const totp = require('otplib');
var CryptoJS = require("crypto-js");

/*module.exports.getUsers = async function() {
    try {
        let sql = "select * from users";
        let result = await pool.query(sql);
        if (result.rows.length > 0) 
            return { status:200, result:result.rows};
        else return {status: 404, result: {msg: "No users"}};
    } catch(err) {
        console.log(err);
        return {status:500, result: err};
    }
}*/

module.exports.updateTokens = async function() {
    try {

        let users = "select * from users";
        let usersresult = await pool.query(users);

        for (let i = 0; i < usersresult.rows.length; i++) {
            let token = totp.totp.generate(usersresult.rows[i].user_secret);
            console.log({user_id: i+1},{user_token: token});

            var JsonFormatter = {
                stringify: function(cipherParams) {
                  // create json object with ciphertext
                  var jsonObj = { ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64) };
                    
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
                  
                  if (jsonObj.iv) {
                    cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
                  }

                  return cipherParams;
                }
              };
              
              var encrypted = CryptoJS.AES.encrypt(token, usersresult.rows[i].user_secret, {
                format: JsonFormatter
              });
              var decrypted = CryptoJS.AES.decrypt(encrypted, usersresult.rows[i].user_secret, {
                format: JsonFormatter
              });
              decrypted.toString(CryptoJS.enc.Utf8);
              
                  console.log( {
                  "key": CryptoJS.enc.Base64.stringify(encrypted.key),
                  "iv": CryptoJS.enc.Base64.stringify(encrypted.iv),
                  "encrypted": CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
                  "decrypted": decrypted.toString(CryptoJS.enc.Utf8),
                });


            let sql ="update users "+
            "set user_token = $1, user_tokeniv = $2, user_tokenkey = $3 where user_id = $4";
            let result = await pool.query(sql,[CryptoJS.enc.Base64.stringify(encrypted.ciphertext),CryptoJS.enc.Base64.stringify(encrypted.iv),CryptoJS.enc.Base64.stringify(encrypted.key),i+1]);
        }
        return { status:200 };
        
    } catch(err) {
        console.log(err);
        return {status:500, result: err};
    }
}

module.exports.verifySecret = async function(secret) {
    try {

        let user ="select * from users where user_secret = $1";
        let resultuser = await pool.query(user,[secret.secretcode]);

    if(resultuser.rowCount == 1) {
        if(resultuser.rows[0].user_check == false) {
        let sql ="update users "+
            "set user_check = true where user_id = $1";
            let result = await pool.query(sql,[resultuser.rows[0].user_id]);
            console.log("Secret: "+secret.secretcode+" atualizada")
            return { status:200, result:result.rows[0]};
        } else {
            return { status:500, result:"Secret em uso"};
        }
    } else {
        return { status:500, result:"Secret inválida"};
    }
    } catch(err) {
        console.log(err);
        return {status:500, result: err};
    }
}

module.exports.getTokenBySecret = async function(secret) {
    try {
        let sql ="select user_token, user_tokenkey, user_tokeniv from users where user_secret = $1";
        let result = await pool.query(sql,[secret]);
        let token = result.rows[0];
        console.log(token.user_token);
        if (result.rows.length > 0)  
        return {status: 200, result: result.rows[0] };
    else return {status: 404, result: {msg: "Secret não encontrada"}};
    } catch (err) {
        console.log(err);
        return { status:500, result: err};
    }
}

