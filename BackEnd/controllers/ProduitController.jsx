const bwipjs = require("bwip-js");


// OUTILS de EAN-13
function calculerCleEAN13(code12) {
  if (!/^\d{12}$/.test(code12)) {
    throw new Error("Le code doit contenir exactement 12 chiffres.");
  }

  let somme = 0;

  for (let i = 0; i < 12; i++) {
    const chiffre = parseInt(code12[i], 10);

    if ((i + 1) % 2 === 0) {
      somme += chiffre * 3;
    } else {
      somme += chiffre;
    }
  }

  const cle = (10 - (somme % 10)) % 10;
  return cle.toString();
}

function genererEAN13BaseSurId(idProduit) {
  const prefixe = "200";
  const idFormate = String(idProduit).padStart(9, "0");
  const code12 = prefixe + idFormate;
  const cle = calculerCleEAN13(code12);

  return code12 + cle;
}


// CREER PRODUIT en SQL

const creerProduit = (db) => (req, res) => {
  console.log("Route creerProduit appelée");
  console.log("Body reçu :", req.body);

  const {
    Produit_name,
    descrition_produit,
    prix,
    categorie_ID,
    quantite_stock = 0,
    id_user,
  } = req.body;

  if (!Produit_name || prix === undefined || !categorie_ID) {
    return res.status(400).json({
      message: "Produit_name, prix et categorie_ID sont obligatoires.",
    });
  }

  const sqlProduit = `
    INSERT INTO produit (Produit_name, descrition_produit, prix, categorie_ID)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sqlProduit,
    [Produit_name, descrition_produit || null, prix, categorie_ID],
    (err, resultProduit) => {
      if (err) {
        console.error("Erreur insertion produit :", err);
        return res.status(500).json({
          message: "Erreur lors de la création du produit.",
          erreur: err.message,
        });
      }

      const idProduit = resultProduit.insertId;
      console.log("Produit inséré, ID :", idProduit);

      let ean13;
      try {
        ean13 = genererEAN13BaseSurId(idProduit);
        console.log("EAN13 généré :", ean13);
      } catch (error) {
        console.error("Erreur génération EAN13 :", error);
        return res.status(500).json({
          message: "Erreur lors de la génération du code EAN-13.",
          erreur: error.message,
        });
      }

      const sqlBarreCode = `
        INSERT INTO barre_code (code_barre13, Produit_IDE, date)
        VALUES (?, ?, NOW())
      `;

      db.query(sqlBarreCode, [ean13, idProduit], (err, resultBarreCode) => {
        if (err) {
          console.error("Erreur insertion barre_code :", err);
          return res.status(500).json({
            message: "Produit créé mais erreur lors de l'enregistrement du code-barres.",
            erreur: err.message,
          });
        }

        const idCodeBarre = resultBarreCode.insertId;
        console.log("Code-barres inséré, ID :", idCodeBarre);

        const sqlStock = `
          INSERT INTO stock (quantite_stock, date_stock, id_ProduitE)
          VALUES (?, CURDATE(), ?)
        `;

        db.query(sqlStock, [quantite_stock, idProduit], (err, resultStock) => {
          if (err) {
            console.error("Erreur insertion stock :", err);
            return res.status(500).json({
              message: "Produit et code-barres créés, mais erreur lors de la création du stock.",
              erreur: err.message,
            });
          }

          console.log("Stock inséré :", resultStock);

          if (id_user) {
            const sqlHistorique = `
              INSERT INTO historique (action, Id_userE, id_ProduitE, id_codeBarreE, date)
              VALUES (?, ?, ?, ?, NOW())
            `;

            db.query(
              sqlHistorique,
              ["Création produit", id_user, idProduit, idCodeBarre],
              (err, resultHistorique) => {
                if (err) {
                  console.error("Erreur insertion historique :", err);
                  return res.status(201).json({
                    message: "Produit créé avec succès, mais historique non enregistré.",
                    produit: {
                      id_Produit: idProduit,
                      Produit_name,
                      descrition_produit,
                      prix,
                      categorie_ID,
                    },
                    code_barre: ean13,
                    quantite_stock,
                    warning: err.message,
                  });
                }

                console.log("Historique inséré :", resultHistorique);

                return res.status(201).json({
                  message: "Produit créé avec succès.",
                  produit: {
                    id_Produit: idProduit,
                    Produit_name,
                    descrition_produit,
                    prix,
                    categorie_ID,
                  },
                  code_barre: ean13,
                  quantite_stock,
                });
              }
            );
          } else {
            return res.status(201).json({
              message: "Produit créé avec succès.",
              produit: {
                id_Produit: idProduit,
                Produit_name,
                descrition_produit,
                prix,
                categorie_ID,
              },
              code_barre: ean13,
              quantite_stock,
            });
          }
        });
      });
    }
  );
};


// Affichage Liste produit

const listerProduits = (db) => (req, res) => {
  const sql = `
    SELECT 
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.date_creation_produit,
      c.id_categorie,
      c.name_categorie,
      bc.id_codeBarre,
      bc.code_barre13,
      bc.date AS date_code_barre,
      s.id_stock,
      s.quantite_stock,
      s.date_stock
    FROM produit p
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    LEFT JOIN barre_code bc ON p.id_Produit = bc.Produit_IDE
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    ORDER BY p.id_Produit DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors de la récupération des produits.",
        erreur: err.message,
      });
    }

    return res.status(200).json(results);
  });
};


// Produit par ID
const getProduitById = (db) => (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.date_creation_produit,
      c.id_categorie,
      c.name_categorie,
      bc.id_codeBarre,
      bc.code_barre13,
      bc.date AS date_code_barre,
      s.id_stock,
      s.quantite_stock,
      s.date_stock
    FROM produit p
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    LEFT JOIN barre_code bc ON p.id_Produit = bc.Produit_IDE
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    WHERE p.id_Produit = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors de la récupération du produit.",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Produit non trouvé.",
      });
    }

    return res.status(200).json(results[0]);
  });
};


// Rcherche pqr CODE-BARRES
const getProduitParCodeBarre = (db) => (req, res) => {
  const { code } = req.params;

  const sql = `
    SELECT
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.categorie_ID,
      p.date_creation_produit,
      bc.id_codeBarre,
      bc.code_barre13,
      s.id_stock,
      s.quantite_stock,
      c.name_categorie
    FROM barre_code bc
    INNER JOIN produit p ON bc.Produit_IDE = p.id_Produit
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    WHERE bc.code_barre13 = ?
    LIMIT 1
  `;

  db.query(sql, [code], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors de la recherche par code-barres.",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Aucun produit trouvé pour ce code-barres.",
      });
    }

    return res.status(200).json({
      message: "Produit trouvé.",
      produit: results[0],
    });
  });
};

// =========================
// le scan par JSON (BOdy)

const scannerProduit = (db) => (req, res) => {
  const { code_barre13 } = req.body;

  if (!code_barre13) {
    return res.status(400).json({
      message: "Le champ code_barre13 est obligatoire.",
    });
  }

  const sql = `
    SELECT
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.categorie_ID,
      p.date_creation_produit,
      bc.id_codeBarre,
      bc.code_barre13,
      s.id_stock,
      s.quantite_stock,
      c.name_categorie
    FROM barre_code bc
    INNER JOIN produit p ON bc.Produit_IDE = p.id_Produit
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    WHERE bc.code_barre13 = ?
    LIMIT 1
  `;

  db.query(sql, [code_barre13], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors du scan du produit.",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Produit introuvable pour ce code.",
      });
    }

    return res.status(200).json({
      message: "Scan réussi.",
      produit: results[0],
    });
  });
};


// du codebar

const afficherCodeBarreProduit = (db) => (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      p.id_Produit,
      p.Produit_name,
      bc.code_barre13
    FROM produit p
    INNER JOIN barre_code bc ON p.id_Produit = bc.Produit_IDE
    WHERE p.id_Produit = ?
    LIMIT 1
  `;

  db.query(sql, [id], async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors de la recherche du code-barres.",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Code-barres non trouvé pour ce produit.",
      });
    }

    const produit = results[0];

    try {
      const png = await bwipjs.toBuffer({
        bcid: "ean13",
        text: produit.code_barre13,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      });

      res.set("Content-Type", "image/png");
      res.send(png);
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de la génération de l'image EAN-13.",
        erreur: error.message,
      });
    }
  });
};


// MODIFIER PRODUIT Modification produit

const modifierProduit = (db) => (req, res) => {
  const { id } = req.params;
  const { Produit_name, descrition_produit, prix, categorie_ID, id_user } = req.body;

  const sql = `
    UPDATE produit
    SET Produit_name = ?, descrition_produit = ?, prix = ?, categorie_ID = ?
    WHERE id_Produit = ?
  `;

  db.query(
    sql,
    [Produit_name, descrition_produit || null, prix, categorie_ID, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Erreur lors de la modification du produit.",
          erreur: err.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Produit non trouvé.",
        });
      }

      if (id_user) {
        const sqlCodeBarre = `
          SELECT id_codeBarre
          FROM barre_code
          WHERE Produit_IDE = ?
          LIMIT 1
        `;

        db.query(sqlCodeBarre, [id], (err, codeResults) => {
          const idCodeBarre =
            !err && codeResults.length > 0 ? codeResults[0].id_codeBarre : null;

          const sqlHistorique = `
            INSERT INTO historique (action, Id_userE, id_ProduitE, id_codeBarreE, date)
            VALUES (?, ?, ?, ?, NOW())
          `;

          db.query(
            sqlHistorique,
            ["Modification produit", id_user, id, idCodeBarre],
            () => {
              return res.status(200).json({
                message: "Produit modifié avec succès.",
              });
            }
          );
        });
      } else {
        return res.status(200).json({
          message: "Produit modifié avec succès.",
        });
      }
    }
  );
};


//Suppr Produit

const supprimerProduit = (db) => (req, res) => {
  const { id } = req.params;
  const { id_user } = req.body;

  const sqlGetCode = `
    SELECT id_codeBarre
    FROM barre_code
    WHERE Produit_IDE = ?
    LIMIT 1
  `;

  db.query(sqlGetCode, [id], (err, codeResults) => {
    const idCodeBarre =
      !err && codeResults.length > 0 ? codeResults[0].id_codeBarre : null;

    const sqlDelete = `DELETE FROM produit WHERE id_Produit = ?`;

    db.query(sqlDelete, [id], (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Erreur lors de la suppression du produit.",
          erreur: err.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Produit non trouvé.",
        });
      }

      if (id_user) {
        const sqlHistorique = `
          INSERT INTO historique (action, Id_userE, id_ProduitE, id_codeBarreE, date)
          VALUES (?, ?, ?, ?, NOW())
        `;

        db.query(
          sqlHistorique,
          ["Suppression produit", id_user, id, idCodeBarre],
          () => {
            return res.status(200).json({
              message: "Produit supprimé avec succès.",
            });
          }
        );
      } else {
        return res.status(200).json({
          message: "Produit supprimé avec succès.",
        });
      }
    });
  });
};

module.exports = {
  creerProduit,
  listerProduits,
  getProduitById,
  getProduitParCodeBarre,
  scannerProduit,
  afficherCodeBarreProduit,
  modifierProduit,
  supprimerProduit,
  calculerCleEAN13,
  genererEAN13BaseSurId,
};