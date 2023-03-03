/*!
* Start Bootstrap - Modern Business v5.0.6 (https://startbootstrap.com/template-overviews/modern-business)
* Copyright 2013-2022 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-modern-business/blob/master/LICENSE)
*/

const req = require("express/lib/request");

// This file is intentionally blank
// Use this file to add JavaScript to your project

function loginout(){
    if (req.isAuthenticated()){
        let output = '<li class="nav-item"><a class="nav-link" href="/users/logout">Logout</a></li>';
        return output;
    }else if (req.isAuthenticated()){
        let output = '<li class="nav-item"><a class="nav-link" href="/users/login">Login</a></li>';
        return output;
    }
}