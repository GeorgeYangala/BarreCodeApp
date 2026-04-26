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
listerUnitesProduit,
afficherCodeBarreUnite,
} = require("./controllers/ProduitController.jsx");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port:Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout:20000,
  ssl:{
    rejectUnauthorized:false,
  },
});

db.connect((err) => {
  if (err) {
    console.error("Erreur connexion MySQL :", err.message);
  } else {
    console.log("Connexion MySQL réussie");
    console.log("Base utilisée :", process.env.DB_NAME);
  }
});

app.get("/", (req, res) => {
  res.send("API Barcode en marche");
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Username et password sont obligatoires.",
    });
  }

  const sql = `
    SELECT 
      u.id,
      u.usename,
      u.email,
      u.password,
      r.name_role
    FROM utilisateur u
    LEFT JOIN role r ON u.role_IdE = r.ir_role
    WHERE u.usename = ? AND u.password = ?
    LIMIT 1
  `;

  db.query(sql, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur serveur.",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        message: "Nom d'utilisateur ou mot de passe incorrect.",
      });
    }

    const user = results[0];

    return res.status(200).json({
      message: "Connexion réussie.",
      user: {
        id: user.id,
        username: user.usename,
        email: user.email,
        role: user.name_role,
      },
    });
  });
});

// CATEGORIES
app.get("/api/categories", (req, res) => {
  const sql = `
    SELECT id_categorie, name_categorie
    FROM categories
    ORDER BY name_categorie ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors de la récupération des catégories.",
        erreur: err.message,
      });
    }

    return res.status(200).json(results);
  });
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
app.get("/api/produits/:id/unites", listerUnitesProduit(db));
app.get("/api/unites/:idUnite/codebarre", afficherCodeBarreUnite(db));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur sur le port ${PORT}`);
});