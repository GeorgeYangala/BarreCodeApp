require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const {
  creerProduit,
  listerProduits,
  getProduitById,
  getProduitParCodeBarre,
  scannerProduit,
  afficherCodeBarreProduit,
  modifierProduit,
  supprimerProduit,
} = require("./controllers/ProduitController.jsx");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Erreur connexion MySQL :", err.message);
  } else {
    console.log("Connexion MySQL réussie");
  }
});

app.get("/", (req, res) => {
  res.send("API Barcode en marche");
});

// CRUD produit
app.post("/api/produits", creerProduit(db));
app.get("/api/produits", listerProduits(db));
app.get("/api/produits/:id", getProduitById(db));
app.put("/api/produits/:id", modifierProduit(db));
app.delete("/api/produits/:id", supprimerProduit(db));

// code-barres et scan
app.get("/api/produits/:id/codebarre", afficherCodeBarreProduit(db));
app.get("/api/scan/:code", getProduitParCodeBarre(db));
app.post("/api/scan", scannerProduit(db));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur sur le port ${PORT}`);
});