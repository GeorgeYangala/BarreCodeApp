const getProduitParCodeBarre = (db) => (req, res) => {
  const { code } = req.params;

  const sql = `
    SELECT 
      p.id_Produit,
      p.Produit_name,
      p.descrition_produit,
      p.prix,
      p.date_creation_produit,
      c.name_categorie,
      bc.code_barre13,
      s.quantite_stock
    FROM barre_code bc
    INNER JOIN produit p ON bc.Produit_IDE = p.id_Produit
    LEFT JOIN categories c ON p.categorie_ID = c.id_categorie
    LEFT JOIN stock s ON p.id_Produit = s.id_ProduitE
    WHERE bc.code_barre13 = ?
    LIMIT 1
  `;

  db.query(sql, [code], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Erreur lors de la recherche du produit.",
        erreur: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Produit non trouvé.",
      });
    }

    res.status(200).json(results[0]);
  });
};

module.exports = {
  getProduitParCodeBarre,
};