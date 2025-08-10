const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// --- Simple Session Middleware ---
const sessions = {}; // In-memory session store

app.use((req, res, next) => {
    let sessionId = req.headers.cookie && req.headers.cookie.split(';').find(c => c.trim().startsWith('sessionId=')) ?
                    req.headers.cookie.split(';').find(c => c.trim().startsWith('sessionId=')).split('=')[1] : null;

    if (sessionId && sessions[sessionId]) {
        req.session = sessions[sessionId];
    } else {
        req.session = null;
    }
    next();
});

// --- Helper Functions to read/write JSON files ---
const readData = (file) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', file), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeData = (file, data) => {
    fs.writeFileSync(path.join(__dirname, 'data', file), JSON.stringify(data, null, 2));
};

// --- Routes ---

// Login Page (GET)
app.get('/login', (req, res) => {
    if (req.session) {
        return res.redirect('/contacts');
    }
    res.render('login', { error: null });
});

// Login Logic (POST)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readData('users.json');
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // Create a new session
        const sessionId = Math.random().toString(36).substring(2, 15);
        sessions[sessionId] = { userId: user.id, username: user.username };
        res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 3600000 }); // 1 hour
        res.redirect('/contacts');
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});

// Register Page (GET)
app.get('/register', (req, res) => {
    res.render('register');
});

// Register Logic (POST)
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const users = readData('users.json');

    if (users.find(u => u.username === username)) {
        return res.render('register', { error: 'Username already exists' });
    }

    const newUser = { id: Date.now(), username, password }; // Note: In a real app, hash the password
    users.push(newUser);
    writeData('users.json', users);

    res.redirect('/login');
});

// Contact List Page (GET) - Protected Route
app.get('/contacts', (req, res) => {
    if (!req.session) {
        return res.redirect('/login');
    }
    const contacts = readData('contacts.json');
    const userContacts = contacts.filter(c => c.userId === req.session.userId);
    res.render('contacts', { username: req.session.username, contacts: userContacts });
});

// Add Contact Page (GET)
app.get('/add-contact', (req, res) => {
    if (!req.session) {
        return res.redirect('/login');
    }
    res.render('add-contact');
});

// Add Contact Logic (POST)
app.post('/add-contact', (req, res) => {
    if (!req.session) {
        return res.redirect('/login');
    }
    const { name, email, phone } = req.body;
    const contacts = readData('contacts.json');
    const newContact = { id: Date.now(), userId: req.session.userId, name, email, phone };
    contacts.push(newContact);
    writeData('contacts.json', contacts);

    res.redirect('/contacts');
});

// Logout
app.get('/logout', (req, res) => {
    if (req.session) {
        delete sessions[Object.keys(sessions).find(key => sessions[key] === req.session)];
    }
    res.clearCookie('sessionId');
    res.redirect('/login');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
