// This file is required by app.js. It sets up event listeners for the two
// main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

// Export a function, so that we can pass the app and io instances from the app.js file:

module.exports = function(app,io){
	app.get('/', function(req, res){
		// Render views/home.html
		res.render('home');
	});

	app.get('/create', function(req,res){
		// Generate unique id for the room
		var id = Math.round((Math.random() * 1000000));

		// Redirect to the random room
		res.redirect('/chat/'+id);
	});

	app.get('/chat/:id', function(req,res){
		// Render the chat.html view
		res.render('chat');
	});

	// Initialize a new socket.io application, named 'chat'
	var chat = io.of('/socket').on('connection', function (socket) {
//		console.log(socket);

		// When the client emits the 'load' event, reply with the number of people in this chat room
		socket.on('load',function(data){
			if(chat.clients(data).length === 0 ) {
				socket.emit('peopleinchat', {number: chat.clients(data).length});
			}
			else {
				socket.emit('peopleinchat', {
					number: chat.clients(data).length,
					user: chat.clients(data)[0].username,
					id: data
				});
			}
		});

		// When the client emits 'login', save his name and add them to the room
		socket.on('login', function(data) {
			console.log("LOGIN", data);
			// Use the socket object to store data. Each client gets their own unique socket object

			socket.username = data.user;
			socket.room = data.id;

			// Add the client to the room
			socket.join(data.id);

			// At least two means we do have an active chat room going
			if(chat.clients(data.id).length >= 2) {
				// Make an array of all existing usernames
				var usernames = [];
				for(var i = 0; i < chat.clients(data.id).length; ++i)
					usernames.push(chat.clients(data.id)[i].username);

				chat.in(data.id).emit(
					// Pick between starting a chat and joining a chat
					// Another person is joining if the chat room is already rockin' with 2 people
					chat.clients(data.id).length > 2 ? 'joinChat' : 'startChat',
					{
						boolean: true,
						id: data.id,
						users: usernames
					});
			}
		});

		// Somebody left the chat
		socket.on('disconnect', function() {
			console.log("LOGOUT", {user: this.username, id: this.room});
			// Notify the other person in the chat room that someone has left
			socket.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user: this.username
			});

			// leave the room
			socket.leave(socket.room);
		});

		// Handle the sending of messages
		socket.on('msg', function(data){
			// When the server receives a message, it sends it to every other person in the room.
			socket.broadcast.to(socket.room).emit('receive', {msg: data.msg, user: data.user});
		});
	});
};
