function calculerCleEAN13(code12) {
  if (!/^\d{12}$/.test(code12)) {
    throw new Error("Le code doit contenir exactement 12 chiffres.");
  }

  let somme = 0;

  for (let i = 0; i < 12; i++) {
    const chiffre = parseInt(code12[i], 10);

    // positions impaires (1,3,5...) => coefficient 1
    // positions paires (2,4,6...) => coefficient 3
    if ((i + 1) % 2 === 0) {
      somme += chiffre * 3;
    } else {
      somme += chiffre;
    }
  }

  const cle = (10 - (somme % 10)) % 10;
  return cle.toString();
}

// Génère un vrai code EAN-13 valide
function genererEAN13BaseSurId(idProduit) {
  // Exemple :
  // préfixe interne 200 + id produit sur 9 chiffres = 12 chiffres
  // puis calcul de la clé
  const prefixe = "200"; // préfixe interne magasin/app
  const idFormate = String(idProduit).padStart(9, "0"); // 9 chiffres
  const code12 = prefixe + idFormate; // 12 chiffres
  const cle = calculerCleEAN13(code12);

  return code12 + cle; // 13 chiffres
}


module.exports = {
  calculerCleEAN13,
  genererEAN13BaseSurId,
};