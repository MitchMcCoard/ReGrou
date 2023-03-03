//DESCRIPTION: This is a web app that tracks the amount of compost created by each customer, displays the results, allows customers to add themselves, and explains our services.

//Create a node app in the express environment
const { response } = require("express");
const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash")
const passport = require("passport");
const initializePassport = require("./passportConfig");
initializePassport(passport);
let path = require("path");
const { pool } = require("./dbConfig");
const res = require("express/lib/response");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const { isUndefined } = require("util");
const { getMaxListeners } = require("process");
const port = process.env.PORT || 3000;
const knex = require (path.join(__dirname + '/knex/knex.js'));
let app = express();

//MIDDLEWARE 
//Allow all types of JavaSCript objects EDITED acording to video
app.use(express.urlencoded({extended: false}));

//This is where to find the public files
app.use(express.static("public"));
app.use(session({
    secret: "secret",
    resave : false,
    saveUninitialized : false
}));
app.use(flash());
app.use(passport.session());
app.use(passport.initialize());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


//Set the view engine to EJS
app.set("view engine", "ejs");

//GET METHODS

//Root route, Home page
app.get("/", (req, res) => {
        res.render("index", {req})
});


//Registration page (users)
app.get("/users/signup", checkAuthenticated, (req, res) => {
    res.render("signup", {req});
});

//Registration page (emp)
/*
app.get("/emp/signup", checkEmpAuthenticated, (req, res) => {
    res.render("empsignup", {req});
});
*/


//Should modify to only render those that have a bPause as false
app.get("/emp/pickup", checkEmpNotAuthenticated, (req, res) => {
    knex.select().from("custdata").then(customers =>{
        res.render("pickup", {
            customers : customers,
            user: req.user.fName,
            req : req
        })
    }).catch(err =>{
        console.log(err);
        res.status(500).json({err});
        res.redirect("/whoops");
    });
});

//Login page
app.get("/users/login", checkAuthenticated, (req, res) => {
    res.render("login", {req});
});

app.get("/emp/login", checkEmpAuthenticated, (req, res) => {
    res.render("login", {req});
});

app.get("/Whoops", (req, res) => {
    res.render("whoops",{req});
});

app.get("/users/stats",checkNotAuthenticated, (req, res) =>{
    //Need to change to send most recent date somehow and compare with that.
    knex("pickup").join("custdata", "pickup.iUser", "=", "custdata.iCust_id")
        .select("dDate", "iWeight", "sFirstName")
        .whereBetween("dDate", [lastWeek(7), insertDate()])
        .orderBy("iWeight" , "desc")
        .then(statTable =>{
            res.render("stats", {
                user: req.user.fName,
                records : statTable,
                req : req,
                date1 : lastWeek(7),
                date2 : insertDate()
            })
    }).catch(err =>{
        console.log(err);
        res.status(500).json({err});
        res.redirect("/whoops");
    });
});

app.get("/users/logout", (req, res) =>{
    req.logOut();
    req.flash("success_msg", "You have logged out");
    res.redirect("/");
});

app.get("/faq", (req, res) =>{
    res.render("faq", {req});
});

app.get("/pricing", (req, res) =>{
    res.render("pricing", {req});
});

app.get("/laccount", (req, res)=>{
    res.render("laccount",{req});
});

//Should change this to identify based on something else other than first name. What if someone has the same First name?
app.get("/account", checkNotAuthenticated, (req, res) =>{
    knex("users").join("custdata", "users.sEmail", "=", "custdata.sEmail")
        .select()
        .where("sFirstName", req.user.fName)
        .then(account =>{
            res.render("account", {
                user: req.user.fName,
                account : account,
                req : req
            })
    }).catch(err =>{
        console.log(err);
        res.status(500).json({err});
        res.redirect("/whoops");
    });
});

//POST METHODS

//Inserting the new accounts, if they have met cryteria
app.post("/users/signup", async (req, res)=>{
    let {
        fname,
        email,
        password,
        password2,
        lname,
        phone,
        address,
        venmo,
        source,
        student,
        reminder
    } = req.body;

    let errors = [];

    if (!fname || !email || !password || !password2 || !lname || !phone || !address || !venmo){
        errors.push({message: "Please enter all fields" });
    }

    if (password.length < 6){
        errors.push({message: "Password should be at least 6 characters long" });
    }

    if (password != password2){
        errors.push({message: "Passwords do not match" });
    }

    //Check for unchecked check boxes
    if (source === undefined){
        source = "";
    }
    if (student == undefined){
        student = false;
    }
    if (reminder == undefined){
        reminder = false;
    }

    if (errors.length > 0){
        res.render("signup", { errors, req});
    }

    else{
        //Form validation has passed

        let hashedPassword = await bcrypt.hash(password, 10);

        knex.select().from("users").where("users.sEmail", email).then(prevUser =>{

                if(prevUser.length > 0 )
                {
                    errors.push({message: "Email already registered"});
                    res.render("signup", {errors, req});
                }
                else
                {
                    knex("users").insert({
                        fName : fname,
                        sEmail : email,
                        shPassword : hashedPassword
                    }).then(newuser =>{
                        knex("custdata").insert({
                            sFirstName : fname,
                            sLastName : lname,
                            iPhone : phone,
                            sEmail : email,
                            sVenmo : venmo,
                            dStartDate : insertDate(),
                            sSource : source,
                            bStudent : student,
                            bReminder : reminder,
                            sAddress : address
                        }).then(newRecord =>{
                            req.flash('success_msg', "You are now registered. Please log in");
                            res.redirect("/users/login");
                        }).catch(err =>{
                            console.log(err);
                            res.status(500).json({err});
                            res.redirect("/Whoops");
                        });
                    }).catch(err =>{
                        console.log(err);
                        res.status(500).json({err});
                        res.redirect("/Whoops");
                    });
                }
            }
        ).catch(err =>{
            console.log(err);
            res.status(500).json({err});
            res.redirect("/Whoops");
        })
    }
});

//Update account. Need to finish this program
app.post("/updateAccount", async (req, res)=>{
    let {
        fname,
        email,
        lname,
        phone,
        address,
        venmo,
        source,
        student,
        reminder
    } = req.body;

    let errors = [];

    if (!fname || !email || !lname || !phone || !address || !venmo){
        errors.push({message: "Please enter all fields" });
    }
//Check for unchecked check boxes
    if (source === undefined){
        source = "";
    }
    if (student == undefined){
        student = false;
    }
    if (reminder == undefined){
        reminder = false;
    }
    if (errors.length > 0){
        res.render("signup", { errors, req});
    }
    else{
        knex("users").where("users.sEmail", email).update({
            fName : fname,
            sEmail : email
        }).then(newuser =>{
            knex("custdata").where("custdata.sEmail", email).update({
                sFirstName : fname,
                sLastName : lname,
                iPhone : phone,
                sEmail : email,
                sVenmo : venmo,
                sSource : source,
                bStudent : student,
                bReminder : reminder,
                sAddress : address
            }).then(newRecord =>{
                req.flash('success_msg', "You are now registered. Please log in");
                res.redirect("/users/login");
            }).catch(err =>{
                console.log(err);
                res.status(500).json({err});
                res.redirect("/Whoops");
            });
        }).catch(err =>{
            console.log(err);
            res.status(500).json({err});
            res.redirect("/Whoops");
        });
    }
});

app.post(
    "/account/login",
        passport.authenticate("local", {
        successRedirect : "/account",
        failureRedirect : "/laccount",
        failureFlash : true
        })
);


app.post("/emp/pickup", async (req, res)=>{
    let {cust, weight, pickup, date, emp} = req.body;

    date = insertDate()

    let errors = [];

    if (!cust || !weight){
        errors.push({message: "Please enter all fields" });
    }

    if (pickup === undefined){
        pickup = false;
    }

    if(pickup == "true"){
        pickup = true;
    }

    if(pickup == "false"){
        pickup = false;
    }

    if(!emp){
        errors.push({message : "Please Log in to continue"});
    }

    if(pickup == false){
        weight = 0;
    }

    if (errors.length > 0){
            req.flash('error', errors.message);
            res.redirect("/emp/pickup");
    }
    else{
        //Form validation has passed


        //This inserts the pickup
        knex.select().from("pickup").where("pickup.iUser", cust).andWhere("pickup.dDate", date).then(prevPick =>{

                if(prevPick.length > 0 )
                {
                    errors.push({message: "Already submitted pickup"});

                    knex.select().from("custdata").then(customers =>{
                        res.render("pickup", {
                            errors,
                            customers : customers,
                            user: emp,
                            req : req
                        })
                    }).catch(err =>{
                        console.log(err);
                        res.status(500).json({err});
                        res.redirect("/whoops");
                    });
                }
                else
                {
                    knex("pickup").insert({
                        iUser : cust,
                        iWeight : weight,
                        bPickUp : pickup,
                        dDate : date,
                        sEmp : emp
                    }).then(newRecord =>{
                        knex.select().from("custdata").then(customers =>{
                            res.render("pickup", {
                                customers : customers,
                                user: emp,
                                req : req,
                                messages : {
                                    success_msg : "Pick Up Submitted"
                                }
                            })
                        }).catch(err =>{
                            console.log(err);
                            res.status(500).json({err});
                            res.redirect("/whoops");
                        });
                    }).catch(err =>{
                        console.log(err);
                        res.status(500).json({err});
                        res.redirect("/Whoops");
                    })
                }
            }
        ).catch(err =>{
            console.log(err);
            res.status(500).json({err});
            res.redirect("/Whoops");
        })
    }
});

app.post(
    "/users/login",
        passport.authenticate("local", {
        successRedirect : "/users/stats",
        failureRedirect : "/users/login",
        failureFlash : true
        })
);

//couldn't get this to work
app.post("/message", (req, res) =>{
    let transporter = nodemailer.createTransport({
        /*host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: "we.regrou@gmail.com",
            pass: "C@mp@st4u"
        } */
        host: "smtp.ethereal.email",
           port: 587,
           secure: false, // true for 465, false for other ports
           auth: {
               user: "mckenzie.kunde90@ethereal.email", // generated ethereal user
               pass: "PJzBby3mK6UeruuE2p", // generated ethereal password
           },
    });
    let mailOptions = {
        from: '"Mitchell McCoard" <we.regrou@gmail.com>',
        to: "we.regrou@gmail.com",
        subject : req.body.subject,
        text: req.body.body,
        html: "<b>NodeJS Email Tutorial<b>"
    };

    transporter.sendMail(mailOptions, (error, info) =>{
        if(error) {
            res.redirect("/Whoops");
            return console.log(error);
        }
        console.log("Message %s sent: %s", info.messageId, info.response);
            res.render('index', {req});
    });
});

//Functions

function checkEmpAuthenticated(req, res, next){
    if (req.isAuthenticated())
    {
        return res.redirect("/users/stats");
        }
    next();
};

function checkEmpNotAuthenticated(req,res,next){
    if (req.isAuthenticated())
    {
        return next();
    }
    res.redirect("/users/login");
}


function checkAuthenticated(req, res, next){
    if (req.isAuthenticated())
    {
        return res.redirect("/users/stats");
    }
    next();
};

function checkNotAuthenticated(req,res,next){
    if (req.isAuthenticated())
    {
        return next();
    }

    res.redirect("/users/login");
}

function insertDate(){
    let currentDate = new Date();
    let output =
        currentDate.getFullYear() + "-" +
        (currentDate.getMonth() + 1) + "-" +
        currentDate.getDate();
    return output;
}

function lastWeek(days){
    let currentDate = new Date();
    let lastWeek = new Date(currentDate.getTime() - days * 24 * 60 * 60 * 1000);
    let ouput =
        lastWeek.getFullYear() + "-" +
        (lastWeek.getMonth() + 1) + "-" +
        lastWeek.getDate();
    return ouput;
}


//Start listening
app.listen(port, () => console.log("Go, Fight, Win!"));