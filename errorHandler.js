const APIError =require("../utils/errors")
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: 'Une erreur est survenue sur le serveur.' });
  };
  
  module.exports = errorHandler;