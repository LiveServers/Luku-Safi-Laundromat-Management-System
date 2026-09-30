const isManagerRole = (role) => role === 'owner' || role === 'manager';

const requireManager = (req, res, next) => {
  if (!isManagerRole(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied. Manager role required.' });
  }
  next();
};

module.exports = { requireManager, isManagerRole };
