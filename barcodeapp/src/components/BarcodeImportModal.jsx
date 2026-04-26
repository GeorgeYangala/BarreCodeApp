import React, { useState } from "react";
import {
  extractBarcodeFromFile,
  scanImportedBarcode,
} from "../services/barcodeImportService";
import { getBarcodeImageUrl } from "../services/productService";

export default function BarcodeImportModal({ onClose }) {
  const [fileName, setFileName] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [decodedCode, setDecodedCode] = useState("");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setProduct(null);
    setDecodedCode("");
    setPreviewSrc("");
    setFileName(file.name);

    try {
      const { code, previewSrc } = await extractBarcodeFromFile(file);
      setDecodedCode(code);
      setPreviewSrc(previewSrc);

      const scanResponse = await scanImportedBarcode(code);
      setProduct(scanResponse.produit);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de lire ce code-barres."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            Importer un code-barres
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-slate-800 font-semibold"
          >
            Fermer
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fichier PNG, JPG ou PDF
            </label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,application/pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            />
          </div>

          {fileName && (
            <div className="text-sm text-slate-600">
              <span className="font-semibold">Fichier :</span> {fileName}
            </div>
          )}

          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
              Analyse du fichier en cours...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {previewSrc && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Aperçu</h3>
              <img
                src={previewSrc}
                alt="Aperçu du fichier"
                className="max-h-72 object-contain mx-auto"
              />
            </div>
          )}

          {decodedCode && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              <span className="font-semibold">Code détecté :</span> {decodedCode}
            </div>
          )}

          {product && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                Produit trouvé
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Nom :</span>{" "}
                  {product.Produit_name}
                </p>
                <p>
                  <span className="font-semibold">Prix :</span> {product.prix}
                </p>
                <p>
                  <span className="font-semibold">Stock :</span>{" "}
                  {product.nombre_unites_disponibles ?? product.quantite_stock}
                </p>
                <p>
                  <span className="font-semibold">Catégorie :</span>{" "}
                  {product.name_categorie || product.categorie_ID}
                </p>
                <p>
                    <span className="font-semibold">EAN-13 principal :</span>{" "}
                  {product.code_barre13}
                </p>
                <p>
                  <span className="font-semibold">Description :</span>{" "}
                  {product.descrition_produit || "Sans description"}
                </p>
              </div>

              {product.id_Produit && (
                <div className="mt-5">
                  <h4 className="font-semibold text-slate-800 mb-2">
                    Code-barres enregistré
                  </h4>
                  <img
                    src={getBarcodeImageUrl(product.id_Produit)}
                    alt={`Code barre ${product.Produit_name}`}
                    className="h-24 object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}