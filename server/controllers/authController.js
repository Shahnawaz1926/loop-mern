const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const generateToken = require('../lib/generateToken');

async function signup(req, res) {
  try {
    const { name, email, password, workspaceName } = req.body;

    if (!name || !email || !password || !workspaceName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const workspace = await Workspace.create({ name: workspaceName });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'ADMIN', // creator of a workspace is always ADMIN
      workspaceId: workspace._id,
    });

    const token = generateToken(user._id, workspace._id, user.role);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      workspace: { id: workspace._id, name: workspace.name },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong during signup.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id, user.workspaceId, user.role);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      workspaceId: user.workspaceId,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong during login.' });
  }
}

module.exports = { signup, login };