require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/menu', require('./routes/menu.route'));
app.get('/', (_req, res) => res.redirect('/menu'));

app.listen(PORT, () => {
    console.log(`Server dang chay tai http://localhost:${PORT}`);
});