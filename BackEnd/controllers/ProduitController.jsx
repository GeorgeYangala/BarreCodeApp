const bwipjs = require("bwip-js");


function calculerCleEAN13(code12) {
  if (!/^\d{12}$/.test(code12)) {
    throw new Error("Le code doit contenir exactement 12 chiffres.");
  }

  let somme = 0;

  for (let i = 0; i < 12; i++) {
    const chiffre = parseInt(code12[i], 10);
    somme += (i + 1) % 2 === 0 ? chiffre * 3 : chiffre;
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
function genererEAN13BaseSurUnite(idUnite) {
  const prefixe = "200";
  const idFormate = String(idUnite).padStart(9, "0");
  const code12 = prefixe + idFormate;
  const cle = calculerCleEAN13(code12);

  return code12 + cle;
}const creerUnitesProduit = (db, idProduit, quantite, callback) => {
  const total = Number(quantite);

  if (!total || total <= 0) {
    return callback(null, []);
  }

  const codesGeneres = [];
  let compteur = 0;

  const creerUneUnite = () => {
    const tempCode =
      "TMP" +
      String(Date.now()).slice(-7) +
      String(Math.floor(Math.random() * 1000)).padStart(3, "0");

    const sqlInsert = `
      INSERT INTO produit_unite (id_ProduitE, code_barre13, statut)
      VALUES (?, ?, 'en_stock')
    `;

    db.query(sqlInsert, [idProduit, tempCode], (err, resultUnite) => {
      if (err) return callback(err);

      const idUnite = resultUnite.insertId;
      const codeEAN13 = genererEAN13BaseSurUnite(idUnite);

      const sqlUpdate = `
        UPDATE produit_unite
        SET code_barre13 = ?
        WHERE id_unite = ?
      `;

      db.query(sqlUpdate, [codeEAN13, idUnite], (err) => {
        if (err) return callback(err);

        codesGeneres.push({
          id_unite: idUnite,
          code_barre13: codeEAN13,
        });

        compteur++;

        if (compteur < total) {
          creerUneUnite();
        } else {
          callback(null, codesGeneres);
        }
      });
    });
  };

  creerUneUnite();
};


const creerProduit = (db) => (req, res) => {
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
        return res.status(500).json({
          message: "Erreur création produit.",
          erreur: err.message,
        });
      }

      const idProduit = resultProduit.insertId;

      const sqlStock = `
        INSERT INTO stock (quantite_stock, date_stock, id_ProduitE)
        VALUES (?, CURDATE(), ?)
      `;

      db.query(sqlStock, [quantite_stock, idProduit], (err) => {
        if (err) {
          return res.status(500).json({
            message: "Produit créé, mais erreur création stock.",
            erreur: err.message,
          });
        }

        creerUnitesProduit(
          db,
          idProduit,
          Number(quantite_stock),
          (err, codesUnites) => {
            if (err) {
              return res.status(500).json({
                message: "Produit créé, mais erreur génération unités.",
                erreur: err.message,
              });
            }

            const premierCode = codesUnites[0]?.code_barre13 || null;

            const enregistrerBarreCodeEtHistorique = (idCodeBarre = null) => {
              if (id_user) {
                const sqlHistorique = `
                  INSERT INTO historique (action, Id_userE, id_ProduitE, id_codeBarreE, date)
                  VALUES (?, ?, ?, ?, NOW())
                `;

                db.query(
                  sqlHistorique,
                  ["Création produit", id_user, idProduit, idCodeBarre],
                  () => {
                    return res.status(201).json({
                      message: "Produit créé avec unités et codes-barres.",
                      produit: {
                        id_Produit: idProduit,
                        Produit_name,
                        descrition_produit,
                        prix,
                        categorie_ID,
                      },
                      quantite_stock,
                      premier_code_barre: premierCode,
                      nombre_codes_generes: codesUnites.length,
                    });
                  }
                );
              } else {
                return res.status(201).json({
                  message: "Produit créé avec unités et codes-barres.",
                  produit: {
                    id_Produit: idProduit,
                    Produit_name,
                    descrition_produit,
                    prix,
                    categorie_ID,
                  },
                  quantite_stock,
                  premier_code_barre: premierCode,
                  nombre_codes_generes: codesUnites.length,
                });
              }
            };

            if (premierCode) {
              const sqlBarreCode = `
                INSERT INTO barre_code (code_barre13, Produit_IDE, date)
                VALUES (?, ?, NOW())
              `;

             db.query(sqlBarreCode, [premierCode, idProduit], (err, resultBarre) => {
  if (err) {
    console.error("Erreur barre_code ignorée :", err.message);
    return enregistrerBarreCodeEtHistorique(null);
  }

  enregistrerBarreCodeEtHistorique(resultBarre.insertId);
});
            } else {
              enregistrerBarreCodeEtHistorique(null);
            }
          }
        );
      });
    }
  );
};


const listerProduits = (db) => (req, res) => {
  const sql = `
    SELECT 
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.categorie_ID,
      p.date_creation_produit,
      c.name_categorie,
      s.id_stock,
      s.quantite_stock,
      (
        SELECT pu.code_barre13
        FROM produit_unite pu
        WHERE pu.id_ProduitE = p.id_Produit
        ORDER BY pu.id_unite ASC
        LIMIT 1
      ) AS code_barre13,
      (
        SELECT COUNT(*)
        FROM produit_unite pu
        WHERE pu.id_ProduitE = p.id_Produit
        AND pu.statut = 'en_stock'
      ) AS nombre_unites_disponibles
    FROM produit p
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    WHERE p.is_deleted = 0
    ORDER BY p.id_Produit DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur récupération produits.",
        erreur: err.message,
      });
    }

    res.status(200).json(results);
  });
};

///Liste produit par unite produit 
const listerUnitesProduit = (db) => (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      pu.id_unite,
      pu.id_ProduitE,
      pu.code_barre13,
      pu.statut,
      pu.date_creation,
      p.Produit_name
    FROM produit_unite pu
    INNER JOIN produit p ON pu.id_ProduitE = p.id_Produit
    WHERE pu.id_ProduitE = ?
    AND p.is_deleted = 0
    ORDER BY pu.id_unite ASC
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur récupération unités.",
        erreur: err.message,
      });
    }

    return res.status(200).json(results);
  });
};
// PRODUIT PAR ID

const getProduitById = (db) => (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.categorie_ID,
      p.date_creation_produit,
      c.name_categorie,
      bc.id_codeBarre,
      bc.code_barre13,
      s.id_stock,
      s.quantite_stock
    FROM produit p
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    LEFT JOIN barre_code bc ON p.id_Produit = bc.Produit_IDE
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    WHERE p.id_Produit = ? AND p.is_deleted = 0
    LIMIT 1
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur récupération produit",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    return res.status(200).json(results[0]);
  });
};


// RECHERCHE PAR CODE-BARRES

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
      c.name_categorie,
      bc.id_codeBarre,
      bc.code_barre13,
      s.id_stock,
      s.quantite_stock
    FROM barre_code bc
    INNER JOIN produit p ON bc.Produit_IDE = p.id_Produit
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    WHERE bc.code_barre13 = ? AND p.is_deleted = 0
    LIMIT 1
  `;

  db.query(sql, [code], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur recherche par code-barres",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    return res.status(200).json(results[0]);
  });
};


// SCAN

const scannerProduit = (db) => (req, res) => {
  const { code_barre13 } = req.body;

  if (!code_barre13) {
    return res.status(400).json({
      message: "Le champ code_barre13 est obligatoire.",
    });
  }

  const sql = `
    SELECT
      pu.id_unite,
      pu.code_barre13,
      pu.statut,
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.categorie_ID,
      c.name_categorie,
      s.quantite_stock
    FROM produit_unite pu
    INNER JOIN produit p ON pu.id_ProduitE = p.id_Produit
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    WHERE pu.code_barre13 = ?
    AND p.is_deleted = 0
    LIMIT 1
  `;

  db.query(sql, [code_barre13], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur scan produit.",
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



// IMAGE CODE-BARRES

const afficherCodeBarreProduit = (db) => (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT p.id_Produit, p.Produit_name, bc.code_barre13
    FROM produit p
    INNER JOIN barre_code bc ON p.id_Produit = bc.Produit_IDE
    WHERE p.id_Produit = ? AND p.is_deleted = 0
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

    try {
      const png = await bwipjs.toBuffer({
        bcid: "ean13",
        text: results[0].code_barre13,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      });

      res.set("Content-Type", "image/png");
      res.send(png);
    } catch (error) {
      return res.status(500).json({
        message: "Erreur génération image EAN-13",
        erreur: error.message,
      });
    }
  });
};

///affichage code barre par uniter produit 
const afficherCodeBarreUnite = (db) => (req, res) => {
  const { idUnite } = req.params;

  const sql = `
    SELECT code_barre13
    FROM produit_unite
    WHERE id_unite = ?
    LIMIT 1
  `;

  db.query(sql, [idUnite], async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur recherche code unité.",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Code unité introuvable.",
      });
    }

    try {
      const png = await bwipjs.toBuffer({
        bcid: "ean13",
        text: results[0].code_barre13,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      });

      res.set("Content-Type", "image/png");
      res.send(png);
    } catch (error) {
      return res.status(500).json({
        message: "Erreur génération image unité.",
        erreur: error.message,
      });
    }
  });
};

// MODIFIER PRODUIT


const modifierProduit = (db) => (req, res) => {
  const { id } = req.params;
  const {
    Produit_name,
    descrition_produit,
    prix,
    categorie_ID,
    quantite_stock,
    id_user,
  } = req.body;

  const sqlProduit = `
    UPDATE produit
    SET Produit_name = ?, descrition_produit = ?, prix = ?, categorie_ID = ?
    WHERE id_Produit = ? AND is_deleted = 0
  `;

  db.query(
    sqlProduit,
    [Produit_name, descrition_produit || null, prix, categorie_ID, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Erreur modification produit",
          erreur: err.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Produit non trouvé.",
        });
      }

      const sqlStock = `
        UPDATE stock
        SET quantite_stock = ?, date_stock = CURDATE()
        WHERE id_ProduitE = ?
      `;

      db.query(sqlStock, [quantite_stock, id], (err) => {
        if (err) {
          return res.status(500).json({
            message: "Produit modifié mais erreur mise à jour stock",
            erreur: err.message,
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
      });
    }
  );
};


const supprimerProduit = (db) => (req, res) => {
  const { id } = req.params;
  const { id_user } = req.body;

  const sql = `
    UPDATE produit
    SET is_deleted = 1,
        deleted_at = NOW(),
        deleted_by = ?
    WHERE id_Produit = ?
  `;

  db.query(sql, [id_user || null, id], (err, result) => {
    if (err) {
      console.error("Erreur suppression logique :", err);
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

    return res.status(200).json({
      message: "Produit supprimé avec succès.",
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
  listerUnitesProduit,
  afficherCodeBarreUnite,
  calculerCleEAN13,
  genererEAN13BaseSurId,
  genererEAN13BaseSurUnite,
};