DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    api_key TEXT UNIQUE,
    referral_code TEXT UNIQUE,
    referred_by_id INTEGER,
    role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS mobile_sessions;
CREATE TABLE mobile_sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS b2b_clients;
CREATE TABLE b2b_clients (
    client_id TEXT PRIMARY KEY,
    secret_key TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS wallets;
CREATE TABLE wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    balance_available REAL DEFAULT 0.0,
    balance_pending REAL DEFAULT 0.0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS wallet_transactions;
CREATE TABLE wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('credit', 'debit')) NOT NULL,
    status TEXT CHECK(status IN ('pending', 'completed', 'failed')) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER, 
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT CHECK(type IN ('product', 'blog')) NOT NULL,
    FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS providers;
CREATE TABLE providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active'
);

DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    provider_product_code TEXT NOT NULL,
    name TEXT NOT NULL,
    stock_type TEXT CHECK(stock_type IN ('unique', 'general')) NOT NULL,
    order_type TEXT CHECK(order_type IN ('prepaid', 'postpaid')) DEFAULT 'prepaid',
    price REAL NOT NULL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS inventory;
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    status TEXT CHECK(status IN ('available', 'used')) DEFAULT 'available',
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions (
    id TEXT PRIMARY KEY, 
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    customer_number TEXT NOT NULL,
    order_type TEXT NOT NULL,
    bill_amount REAL DEFAULT 0,
    admin_markup REAL DEFAULT 0,
    total_price REAL NOT NULL,
    status TEXT CHECK(status IN ('inquiry_pending', 'waiting_payment', 'processing', 'success', 'failed')) NOT NULL,
    provider_response TEXT, 
    idempotency_key TEXT UNIQUE NOT NULL, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
);

DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);
