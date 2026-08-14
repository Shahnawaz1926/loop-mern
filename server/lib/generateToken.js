const jwt = require('jsonwebtoken');

function generateToken(userId, workspaceId, role) {
  return jwt.sign(
    { userId, workspaceId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = generateToken;