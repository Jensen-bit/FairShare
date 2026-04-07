const express = require('express');
const bodyParser = require('body-parser');
const pgp = require('pg-promise')();
const session = require('express-session');
const bcrypt = require('bcryptjs');
const exphbs = require('express-handlebars');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.engine(
  'hbs',
  exphbs.engine({
    extname: '.hbs'
  })
);
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'super duper secret!',
    resave: false,
    saveUninitialized: false
  })
);

const db = pgp({
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

// Temporary auto-login for testing/demo
app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = {
      user_id: 1,
      full_name: 'Brennan Long'
    };
  }
  next();
});

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

/*
  Balance logic:
  + positive net_balance => roommate owes logged-in user
  + negative net_balance => logged-in user owes roommate
*/
app.get('/balances', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const currentUserId = req.session.user.user_id;

    const query = `
      WITH paid_by_me AS (
        SELECT
          ep.user_id AS roommate_id,
          SUM(ep.amount_owed) AS amount
        FROM expenses e
        JOIN expense_participants ep ON e.expense_id = ep.expense_id
        WHERE e.paid_by = $1
          AND ep.user_id <> $1
        GROUP BY ep.user_id
      ),
      i_owe_them AS (
        SELECT
          e.paid_by AS roommate_id,
          SUM(ep.amount_owed) AS amount
        FROM expenses e
        JOIN expense_participants ep ON e.expense_id = ep.expense_id
        WHERE ep.user_id = $1
          AND e.paid_by <> $1
        GROUP BY e.paid_by
      ),
      combined AS (
        SELECT
          u.user_id AS roommate_id,
          u.full_name AS roommate_name,
          COALESCE(pbm.amount, 0) - COALESCE(iot.amount, 0) AS net_balance
        FROM users u
        LEFT JOIN paid_by_me pbm ON u.user_id = pbm.roommate_id
        LEFT JOIN i_owe_them iot ON u.user_id = iot.roommate_id
        WHERE u.user_id <> $1
      )
      SELECT roommate_id, roommate_name, ROUND(net_balance::numeric, 2) AS net_balance
      FROM combined
      ORDER BY roommate_name;
    `;

    const rows = await db.any(query, [currentUserId]);

    const balances = rows.map((row) => {
      const amount = Number(row.net_balance);

      if (amount > 0) {
        return {
          roommate_id: row.roommate_id,
          roommate_name: row.roommate_name,
          net_balance: amount,
          color_class: 'text-success',
          is_zero: false,
          display_text: `${row.roommate_name} owes you $${amount.toFixed(2)}`
        };
      }

      if (amount < 0) {
        return {
          roommate_id: row.roommate_id,
          roommate_name: row.roommate_name,
          net_balance: amount,
          color_class: 'text-danger',
          is_zero: false,
          display_text: `You owe ${row.roommate_name} $${Math.abs(amount).toFixed(2)}`
        };
      }

      return {
        roommate_id: row.roommate_id,
        roommate_name: row.roommate_name,
        net_balance: amount,
        color_class: 'text-secondary',
        is_zero: true,
        display_text: '$0.00'
      };
    });

    res.render('pages/balances', { balances });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading balances page');
  }
});

app.get('/', (req, res) => {
  res.redirect('/balances');
});

module.exports = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
