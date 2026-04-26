import React, { useEffect, useState } from "react";
import { getCategories } from "../services/categoryService";

export default function ProductForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    Produit_name: "",
    descrition_produit: "",
    prix: "",
    categorie_ID: "",
    quantite_stock: "",
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Erreur chargement catégories :", error);
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
    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        prix: Number(formData.prix),
        categorie_ID: Number(formData.categorie_ID),
        quantite_stock: Number(formData.quantite_stock),
      });

      setFormData({
        Produit_name: "",
        descrition_produit: "",
        prix: "",
        categorie_ID: "",
        quantite_stock: "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Ajouter un produit
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nom du produit
          </label>
          <input
            type="text"
            name="Produit_name"
            value={formData.Produit_name}
            onChange={handleChange}
            placeholder="Entrer le nom du produit"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <input
            type="text"
            name="descrition_produit"
            value={formData.descrition_produit}
            onChange={handleChange}
            placeholder="Description du produit"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Prix
            </label>
            <input
              type="number"
              name="prix"
              value={formData.prix}
              onChange={handleChange}
              placeholder="Prix"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Stock
            </label>
            <input
              type="number"
              name="quantite_stock"
              value={formData.quantite_stock}
              onChange={handleChange}
              placeholder="Stock"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Catégorie
            </label>
            <select
              name="categorie_ID"
              value={formData.categorie_ID}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition duration-300 disabled:opacity-60"
        >
          {loading ? "Ajout..." : "Ajouter"}
        </button>
      </form>
    </div>
  );
}