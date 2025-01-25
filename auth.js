const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY || 'defaultSecretKey';

exports.authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).send({ message: 'Accès refusé. Aucun token fourni.' });

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send({ message: 'Token invalide.' });
  }
};