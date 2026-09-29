import jwt from 'jsonwebtoken';

/**
 * Middleware: Verify user JWT and inject verified context into Request object
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    if (decoded.status === 'SUSPENDED' || decoded.status === 'BANNED') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or banned. Contact administration.'
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      status: decoded.status,
      baseCurrency: decoded.baseCurrency || 'MYR'
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

/**
 * Middleware: Enforces roles (e.g., ADMIN only)
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Unauthorized role.'
      });
    }
    next();
  };
};
