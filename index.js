const jwt_decode = require("jwt-decode");
const mysql = require("mysql");
const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
});


exports.handler = (event, context, callback) => {
	const errorIfSet = (err) => {
		if (err) {
			callback(null, {
				statusCode: 404,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: "ops, error encountered: " + err,
				}),
			});
		}
	}; 
	let {duration} = JSON.parse(event.body)
	if(event.headers["Authorization"] && duration && !isNaN(duration)){
		context.callbackWaitsForEmptyEventLoop = false;
		pool.getConnection((err, con) => {
			const updateSuccessful = () => {
				callback(null, {
					statusCode: 200,
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						message: "Update successful",
					}),
				});
			}
			const performAndRelease = (query, params = []) => {
				con.query(query, params, function (err, results) {
					errorIfSet(err);
					con.release();
					updateSuccessful()
				});
			};
			errorIfSet(err);
			const { "cognito:username": username } = jwt_decode(event.headers["Authorization"]);
	
			con.query(`
			replace into buffer(username, duration, score) 
			select tmp.username,  if(b.duration > tmp.duration , b.duration, tmp.duration) duration, b.score
			from buffer b right join (SELECT ? as username, ? as duration) tmp on b.username = tmp.username 
			where tmp.username = ?
			`, [username, duration, username], function (err, results) {
				if(err) errorIfSet(err);
				else{
					callback(null, {
						statusCode: 200,
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							message: "Update successful",
						}),
					});
				}
				
			});
		});
	} else {
		errorIfSet("Authorization token not found or duration is not a number")
	}
};
