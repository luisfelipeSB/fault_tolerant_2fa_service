const { pool } = require("../dbConfig");
const authenticator = require('otplib');
const totp = require('otplib');

module.exports.getUsers = async function() {
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
}

module.exports.updateTokens = async function() {
    try {
        let users = "select * from users";
        let usersresult = await pool.query(users);

        for (let i = 0; i < usersresult.rows.length; i++) {
            let token = totp.totp.generate(usersresult.rows[i].user_secret);
            console.log({id: i+1},{token: token});
            
            let sql ="update users "+
            "set user_token = $1 where user_id = $2";
            let result = await pool.query(sql,[token,i+1]);
        }
        return { status:200 };
        
    } catch(err) {
        console.log(err);
        return {status:500, result: err};
    }
}

module.exports.verifySecret = async function(secret) {
    try {
        /*let user = "select * from users where user_secret = $1";
        let userresult = await pool.query(user,[secret.key]);*/
        let usertest = "select * from users where user_id = $1";
        let usertestresult = await pool.query(usertest,[secret.id]);
        console.log(usertestresult.rows.length);
        console.log(secret.id)
        /*console.log(userresult.rows.length);
        console.log(secret.key)*/
        /*if(userresult.rows.length > 0) {
            let sql ="update users "+
            "set user_check = true where user_id = $1";
            let result = await pool.query(sql,[userresult.rows[0].user_id]);
        } else {
            return {status: 404, result: {msg: "Secret invalid"}};
        }*/
        
    } catch(err) {
        console.log(err);
        return {status:500, result: err};
    }
}



