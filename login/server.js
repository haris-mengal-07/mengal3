import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const app = express();
const PORT = 3000;


app.use(express.urlencoded({ extended: true })); 

const dataDir = path.join(process.cwd(), 'data');
const usersFilePath = path.join(dataDir, 'users.json');


let sessionStore = {};


const readUsers = async () => {
    try {
        const data = await fs.readFile(usersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};
const writeUsers = async (data) => {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(usersFilePath, JSON.stringify(data, null, 2));
};

(async () => {
    const users = await readUsers();
    if (users.length === 0) {
        await writeUsers([{ id: '1', email: 'test@example.com', password: '123' }]);
        console.log('Default user created: test@example.com / 123');
    }
})();



// Cookie Parser
app.use((req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            req.cookies[parts[0].trim()] = parts[1]?.trim();
        });
    }
    next();
});


const isAuthenticated = (req, res, next) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId && sessionStore[sessionId]) {
        req.user = sessionStore[sessionId].user;
        next();
    } else {
        res.redirect('/login'); 
    }
};




app.get('/login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'login.html'));
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = await readUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        sessionStore[sessionId] = { user: { id: user.id, email: user.email } };
        res.cookie('sessionId', sessionId, { httpOnly: true });
        res.redirect('/dashboard');
    } else {
        res.send('Invalid email or password. <a href="/login">Try again</a>');
    }
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.send(`
        <h1>Welcome, ${req.user.email}!</h1>
        <p>dashboard.</p>
        <form action="/logout" method="post">
            <button type="submit">Logout</button>
        </form>
    `);
});


app.post('/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
        delete sessionStore[sessionId];
    }
    res.clearCookie('sessionId');
    res.redirect('/login');
});


app.listen(PORT, () => {
    console.log(` Server is running http://localhost:${PORT}.`);
});