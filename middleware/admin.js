// À utiliser TOUJOURS après le middleware `protect` (qui définit req.user)
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  };
  
  module.exports = { admin };