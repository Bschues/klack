const express = require('express');
const querystring = require('querystring');
const mongoose = require('mongoose');

const dbName = 'klackmessenger';
const DB_USER = 'admin';
const DB_PASSWORD = 'admin1';
const DB_URI = 'ds121312.mlab.com:21312' 
const PORT = process.env.PORT || 3000
const app = express()

// List of all messages
let messages = []

// Track last active times for each sender
let users = {}

app.use(express.static("./public"))
app.use(express.urlencoded({extened: false}))
app.use(express.json())



// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
    var nameA = a.name.toUpperCase(); // ignore upper and lowercase
    var nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
  
    // names must be equal
    return 0;      
}

const messageSchema = new mongoose.Schema({
    sender: String,
    message: String,
    timestamp: Number
})

const userData = mongoose.model("userData", messageSchema)

userData.find((err, data) => {
    if (err) return console.log(err);
    for( i = 0; i < data.length; i++) {
        messages.push(data[i])
    }
})

app.get("/messages", (request, response) => {

    // get the current time
    const now = Date.now();

    // consider users active if they have connected (GET or POST) in last 15 seconds
    const requireActiveSince = now - (15*1000)

    // create a new list of users with a flag indicating whether they have been active recently
    usersSimple = Object.keys(users).map((x) => ({name: x, active: (users[x] > requireActiveSince)}))

    // sort the list of users alphabetically by name
    usersSimple.sort(userSortFn);
    usersSimple.filter((a) => (a.name !== request.query.for))

    // update the requesting user's last access time
    users[request.query.for] = now;

    // send the latest 40 messages and the full user list, annotated with active flags
    response.send({messages: messages.slice(-40), users: usersSimple})
})

app.post("/messages", (request, response) => {
    // add a timestamp to each incoming message.
    const timestamp = Date.now()
    request.body.timestamp = timestamp

    // update the posting user's last access timestamp (so we know they are active)
    users[request.body.sender] = timestamp

    let newMessage = new userData({
        sender: request.body.sender,
        message: request.body.message,
        timestamp: request.body.timestamp
    })
    newMessage.save(function(err) {
        if (err) return console.log(err)
        console.log('message saved')
    })



    // Send back the successful response.
    response.status(201)
    response.send(request.body)
})

app.listen(PORT, () => {
    mongoose.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@${DB_URI}/${dbName}`),
    { useNewUrlParser: true }
    console.log(`listening on port: ${PORT}`)
})