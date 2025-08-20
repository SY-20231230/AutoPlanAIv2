INSERT INTO users (username, email, password_hash, created_at, updated_at) VALUES
('john_doe', 'john.doe@example.com', '$2a$10$ABCDEFGH.ijklmnopqrstuvwxyz1234567890', NOW(), NOW()),
('jane_smith', 'jane.smith@example.com', '$2a$10$ABCDEFGH.ijklmnopqrstuvwxyz1234567890', NOW(), NOW()),
('alice_wong', 'alice.wong@example.com', '$2a$10$ABCDEFGH.ijklmnopqrstuvwxyz1234567890', NOW(), NOW());

INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets and electronic devices.'),
('Books', 'Various genres of books.'),
('Home Goods', 'Items for home and living.'),
('Apparel', 'Clothing and accessories.');

INSERT INTO products (name, description, price, stock, category_id, created_at, updated_at) VALUES
('Laptop Pro X', 'High-performance laptop with 16GB RAM and 512GB SSD.', 1200.00, 50, (SELECT id FROM categories WHERE name = 'Electronics'), NOW(), NOW()),
('Wireless Mouse', 'Ergonomic wireless mouse with long battery life.', 25.50, 200, (SELECT id FROM categories WHERE name = 'Electronics'), NOW(), NOW()),
('The Great Adventure', 'A thrilling fantasy novel.', 15.99, 150, (SELECT id FROM categories WHERE name = 'Books'), NOW(), NOW()),
('Cookbook Delights', 'Recipes for everyday cooking.', 22.00, 80, (SELECT id FROM categories WHERE name = 'Books'), NOW(), NOW()),
('Ceramic Mug Set', 'Set of 4 ceramic mugs for coffee or tea.', 30.00, 100, (SELECT id FROM categories WHERE name = 'Home Goods'), NOW(), NOW()),
('Cotton T-Shirt', 'Comfortable 100% cotton t-shirt, various sizes.', 18.00, 300, (SELECT id FROM categories WHERE name = 'Apparel'), NOW(), NOW());

INSERT INTO orders (user_id, order_date, total_amount, status) VALUES
((SELECT id FROM users WHERE username = 'john_doe'), NOW(), 1225.50, 'completed'),
((SELECT id FROM users WHERE username = 'jane_smith'), NOW(), 40.00, 'pending'),
((SELECT id FROM users WHERE username = 'john_doe'), NOW(), 18.00, 'processing');

INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'john_doe') AND total_amount = 1225.50 LIMIT 1), (SELECT id FROM products WHERE name = 'Laptop Pro X'), 1, 1200.00),
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'john_doe') AND total_amount = 1225.50 LIMIT 1), (SELECT id FROM products WHERE name = 'Wireless Mouse'), 1, 25.50),
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'jane_smith') AND total_amount = 40.00 LIMIT 1), (SELECT id FROM products WHERE name = 'Cookbook Delights'), 1, 22.00),
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'jane_smith') AND total_amount = 40.00 LIMIT 1), (SELECT id FROM products WHERE name = 'The Great Adventure'), 1, 15.99),
((SELECT id FROM orders WHERE user_id = (SELECT id FROM users WHERE username = 'john_doe') AND total_amount = 18.00 LIMIT 1), (SELECT id FROM products WHERE name = 'Cotton T-Shirt'), 1, 18.00);