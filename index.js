"use strict";
const express = require('express');
const app = express();
const GoogleAuth = require('google-auth-library');
const googleId = "yourgoogleid";
const auth = new (new GoogleAuth).OAuth2(googleId, "yourgooglesecret");
const { Pool } = require('pg');
const bodyParser = require('body-parser');

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: true
});

function getUserid(request, response, next) {
	if (request.headers.authorization) {
		auth.verifyIdToken(request.headers.authorization.split(' ')[1] || "null", googleId, function(error, login) {
			if (login) {
				request.userid = login.getPayload()['sub'];
				next();
			}
			else
				response.status(401).json({error: "Invalid token"});
		});
	}
	else
		response.status(401).json({error: "Credentials required"});
}

app.set('port', process.env.PORT || 5000);

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

app.post('/register', getUserid, function(request, response) {
	if (request.body.username) {
		pool.query('insert into users(userid, username) values($1, $2)', [request.userid, request.body.username]).then(result => {
			response.json();
		}).catch(error => {
			let errorMsg = error.stack.split(/[\r\n]+/)[0];
			
			if (errorMsg.includes("unique")) {
				if (errorMsg.includes("username"))
					response.status(403).json({error: "Username already in use"});
				else
					response.status(403).json({error: "User already registered"});
			}
			else {
				console.error(error.stack);
				response.status(500).json({error: "Query failed"});
			}
		});
	}
	else
		response.status(400).json({error: "Username required"});
});

app.get('/username', getUserid, function(request, response) {
	pool.query('select username from users where userid = $1', [request.userid]).then(result => {
		if (result.rows[0])
			response.json(result.rows[0].username);
		else
			response.status(403).json({error: "Registration required"});
	}).catch(error => {
		console.error(error.stack);
		response.status(500).json({error: "Query failed"});
	});
});

app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
});