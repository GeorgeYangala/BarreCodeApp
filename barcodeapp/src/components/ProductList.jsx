import React from "react";
import { getBarcodeImageUrl } from "../services/productService";

export default function ProductList({ products, onDelete, onEdit, onPrintOne }) {
  if (!products.length) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Liste des produits enregistrés
        </h2>
        <p className="text-slate-500">Aucun produit enregistré pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Liste des produits enregistrés
      </h2>

      <div className="space-y-6">
        {products.map((product) => (
          <div
            key={product.id_Produit}
            className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:justify-between gap-4"
          >
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800">
                {product.Produit_name}
              </h3>

              <p className="text-sm text-slate-500 mb-2">
                {product.descrition_produit || "Sans description"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Prix :</span> {product.prix}
                </p>
                <p>
                  <span className="font-semibold">Stock :</span> {product.quantite_stock}
                </p>
                <p>
                  <span className="font-semibold">Catégorie :</span>{" "}
                  {product.name_categorie || product.categorie_ID}
                </p>
                <p>
                  <span className="font-semibold">EAN-13 :</span> {product.code_barre13}
                </p>
              </div>

              <div className="mt-4">
                <img
                  src={getBarcodeImageUrl(product.id_Produit)}
                  alt={`Code barre ${product.Produit_name}`}
                  className="h-20 object-contain"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => onEdit(product)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold"
              >
                Modifier
              </button>

              <button
                onClick={() => onPrintOne(product)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold"
              >
                Printer
              </button>

              <button
                onClick={() => onDelete(product.id_Produit)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}