/**
 * Role-Based Access Control middleware factory.
 * Usage: rbac('president')  or  rbac('chef_service', 'president')
 */
const rbac = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Accès refusé. Rôle requis : ${allowedRoles.join(' ou ')}.`,
      });
    }

    next();
  };
};

module.exports = rbac;
