import React, { useEffect, useState } from "react";
import { getCategories } from "../services/categoryService";

export default function EditProductModal({ product, onClose, onSave }) {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    Produit_name: "",
    descrition_produit: "",
    prix: "",
    categorie_ID: "",
    quantite_stock: "",
  });

  useEffect(() => {
    if (product) {
      setFormData({
        Produit_name: product.Produit_name || "",
        descrition_produit: product.descrition_produit || "",
        prix: product.prix || "",
        categorie_ID: product.categorie_ID || "",
        quantite_stock: product.quantite_stock || "",
      });
    }
  }, [product]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await onSave({
      ...formData,
      prix: Number(formData.prix),
      categorie_ID: Number(formData.categorie_ID),
      quantite_stock: Number(formData.quantite_stock),
    });
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          Modifier le produit
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="Produit_name"
            value={formData.Produit_name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none"
            placeholder="Nom du produit"
            required
          />

          <input
            type="text"
            name="descrition_produit"
            value={formData.descrition_produit}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none"
            placeholder="Description"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              name="prix"
              value={formData.prix}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none"
              placeholder="Prix"
              required
            />

            <input
              type="number"
              name="quantite_stock"
              value={formData.quantite_stock}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none"
              placeholder="Stock"
              required
            />

            <select
              name="categorie_ID"
              value={formData.categorie_ID}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none bg-white"
              required
            >
              <option value="">Choisir une catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id_categorie} value={cat.id_categorie}>
                  {cat.name_categorie}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-slate-800 font-semibold"
            >
              Fermer
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}