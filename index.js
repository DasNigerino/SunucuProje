const express = require('express');
const router = require('./routes');
const errorHandler = require('../middleware/errorHandler');

const app = express();

app.use(express.json());
app.use('/api', router);

// Gestion des erreurs
app.use(errorHandler);

module.exports = app;

router.use(routes)
module.exports=router