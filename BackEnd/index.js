const express = require('express');
const app = express();

// Middleware pour lire JSON
app.use(express.json());

// Route test
app.get('/', (req, res) => {
  res.send('API fonctionne 🚀');
});

// Lancer serveur
app.listen(5000, () => {
  console.log('Serveur lancé sur http://localhost:5000');
});