const LocalStrategy  = require("passport-local").Strategy;

//knex works better for me
//const { pool } =require("./dbConfig");
let path = require("path");
const knex = require (path.join(__dirname + '/knex/knex.js'));

/*
const knex = require("knex")({
    client: "pg",
    connection: {
        host : "localhost",
        user : "kiearmccoard",
        password : "password",
        database : "nodelogin",
        port : 5432
    }
});
*/

const bcrypt = require("bcrypt");

function initialize(passport){
const authenticateUser = (email, password, done)=> {
    knex.select().from("users").where("users.sEmail", email).then(results =>{
        console.log(results);

        if (results.length > 0){
            const user = results[0];

            bcrypt.compare(password, user.shPassword, (err, isMatch)=>{
                if (isMatch){
                    return done(null, user);
                }
                else{
                    done(null, false, {message: "Password is incorrect"})
                }
            })
        }

        else{
            return done(null, false, {message : "You are not registered"})
        }
    }).catch(err => {
        console.log(err);
        res.status(500).json({err});
        res.redirect("/Whoops");
    });
};

    passport.use(
        new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        authenticateUser
        ));

    passport.serializeUser((user, done)=>done(null, user.id));

    passport.deserializeUser((id, done)=>{
        knex.select().from("users").where("users.id", id ).then(results=>{
            return done(null, results[0]);
        });
        
    });
}

module.exports = initialize;