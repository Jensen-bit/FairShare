DROP TABLE IF EXISTS expense_participants CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS users_to_groups CASCADE;
DROP TABLE IF EXISTS roommate_groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE roommate_groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL
);

CREATE TABLE users_to_groups (
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    group_id INT NOT NULL REFERENCES roommate_groups(group_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

CREATE TABLE expenses (
    expense_id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL, 
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    paid_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    group_id INT NOT NULL REFERENCES roommate_groups(group_id) ON DELETE CASCADE, 
    category VARCHAR(50),
    expense_date DATE DEFAULT CURRENT_DATE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_participants (
    participant_id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount_owed NUMERIC(10,2) NOT NULL CHECK (amount_owed >= 0),
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP,
    marked_paid_by INTEGER REFERENCES users(user_id)
);

INSERT INTO users (full_name, email, password) VALUES
('Brennan Long', 'brennan@test.com', 'password'),
('Roommate 1', 'roommate1@test.com', 'password'),
('Roommate 2', 'roommate2@test.com', 'password'),
('Roommate 3', 'roommate3@test.com', 'password');

INSERT INTO roommate_groups (group_name) VALUES ('The Apartment');

INSERT INTO users_to_groups (user_id, group_id) VALUES 
(1, 1), (2, 1), (3, 1), (4, 1);

INSERT INTO expenses (description, amount, paid_by, group_id, category, created_at) VALUES
('Internet Bill', 90.00, 1, 1, 'Utilities', CURRENT_TIMESTAMP - INTERVAL '5 days'),
('Groceries', 60.00, 2, 1, 'Groceries', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('Utilities', 120.00, 1, 1, 'Utilities', CURRENT_TIMESTAMP - INTERVAL '1 day');

INSERT INTO expense_participants (expense_id, user_id, amount_owed, is_paid, paid_at, marked_paid_by) VALUES
(1, 2, 30.00, TRUE, CURRENT_TIMESTAMP - INTERVAL '4 days', 1),
(1, 3, 30.00, FALSE, NULL, NULL),
(2, 1, 30.00, TRUE, CURRENT_TIMESTAMP - INTERVAL '2 days', 2),
(2, 3, 30.00, FALSE, NULL, NULL),
(3, 2, 40.00, FALSE, NULL, NULL),
(3, 3, 40.00, FALSE, NULL, NULL);