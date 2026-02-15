const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'insecure-secret-key'; // Vulnerable: hardcoded secret

app.use(express.json());

// In-memory database (vulnerable - no validation)
let users = [
  {
    id: 1,
    email: 'test@example.com',
    password: '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', // password: testpassword
    name: 'Test User',
  },
];

let products = [
  { id: 1, name: 'Product 1', price: 99.99, description: 'Test product' },
  { id: 2, name: 'Product 2', price: 199.99, description: 'Another product' },
];

// Login endpoint - vulnerable to SQL injection if using DB
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // Vulnerable: No input validation
  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // In real app, verify password with bcrypt
  // For demo, accept any password
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// Get all users - vulnerable: no authentication
app.get('/api/users', (req, res) => {
  // Vulnerable: Returns all user data including passwords
  res.json(users);
});

// Get user by ID - vulnerable: SQL injection pattern
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;

  // Vulnerable: Direct parameter usage without validation
  const user = users.find((u) => u.id == id); // == instead of ===

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// Create user - vulnerable: no validation, XSS possible
app.post('/api/users', (req, res) => {
  const { name, email, password } = req.body;

  // Vulnerable: No input validation, XSS in name/email
  const newUser = {
    id: users.length + 1,
    name, // XSS vulnerability
    email, // XSS vulnerability
    password, // Should be hashed
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

// Update user - vulnerable: no auth, no validation
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  // Vulnerable: No authentication check
  const userIndex = users.findIndex((u) => u.id == id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[userIndex] = { ...users[userIndex], name, email };
  res.json(users[userIndex]);
});

// Delete user - vulnerable: no auth
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;

  // Vulnerable: No authentication
  const userIndex = users.findIndex((u) => u.id == id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users.splice(userIndex, 1);
  res.json({ message: 'User deleted' });
});

// Get products - vulnerable: accepts large payloads
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Get product by ID - vulnerable: path traversal pattern
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;

  // Vulnerable: No validation
  const product = products.find((p) => p.id == id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// Create product - vulnerable: accepts negative values, large payloads
app.post('/api/products', (req, res) => {
  const { name, price, description } = req.body;

  // Vulnerable: No validation, accepts negative prices
  const newProduct = {
    id: products.length + 1,
    name,
    price, // Can be negative
    description,
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Protected route example - vulnerable: weak token validation
app.get('/api/protected', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Vulnerable: Doesn't verify token properly
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ message: 'Protected data', user: decoded });
  } catch (error) {
    // Vulnerable: Returns error details
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
});

// Search endpoint - vulnerable: SQL injection pattern
app.get('/api/search', (req, res) => {
  const { query } = req.query;

  // Vulnerable: Direct query usage (simulated SQL injection)
  if (query && query.includes("' OR 1=1")) {
    // In real DB, this would return all records
    return res.json({ results: users, message: 'All results returned' });
  }

  const results = users.filter((u) =>
    u.name.toLowerCase().includes(query?.toLowerCase() || '')
  );

  res.json({ results });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Sample API running on http://localhost:${PORT}`);
  console.log(`⚠️  This API contains intentional vulnerabilities for testing`);
});
