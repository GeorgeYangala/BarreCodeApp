import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import ProductList from "../components/ProductList";
import EditProductModal from "../components/EditProductModal";
import BarcodeImportModal from "../components/BarcodeImportModal";
import {
  createProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  getProductUnits,
} from "../services/productService";

export default function MainPage() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [products, setProducts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadProducts = async () => {
    try {
      setLoadingList(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Erreur chargement produits :", error);
      setMessage("Erreur lors du chargement des produits.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleAddProduct = async (formData) => {
    try {
      await createProduct({
        ...formData,
        id_user: user?.id,
      });

      setMessage("Produit ajouté avec succès.");
      await loadProducts();
    } catch (error) {
      console.error("Erreur ajout produit :", error);
      setMessage(
        error?.response?.data?.message || "Erreur lors de l'ajout du produit."
      );
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await deleteProduct(id, user?.id);
      setMessage("Produit supprimé avec succès.");
      await loadProducts();
    } catch (error) {
      console.error("Erreur suppression produit :", error);
      setMessage(
        error?.response?.data?.message || "Erreur lors de la suppression."
      );
    }
  };

  const handleSaveEdit = async (formData) => {
    try {
      await updateProduct(selectedProduct.id_Produit, {
        ...formData,
        id_user: user?.id,
      });

      setSelectedProduct(null);
      setMessage("Produit modifié avec succès.");
      await loadProducts();
    } catch (error) {
      console.error("Erreur modification produit :", error);
      setMessage(
        error?.response?.data?.message || "Erreur lors de la modification."
      );
    }
  };

  const handlePrintOne = (product) => {
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>Impression produit</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h1 { margin-bottom: 20px; }
            img { margin-top: 20px; height: 100px; }
            p { font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${product.Produit_name}</h1>
          <p><strong>ID Produit :</strong> ${product.id_Produit}</p>
          <p><strong>Description :</strong> ${
            product.descrition_produit || "Sans description"
          }</p>
          <p><strong>Prix :</strong> ${product.prix}</p>
          <p><strong>Stock :</strong> ${product.quantite_stock}</p>
          <p><strong>Catégorie :</strong> ${
            product.name_categorie || product.categorie_ID
          }</p>
          <p><strong>EAN-13 :</strong> ${product.code_barre13 || ""}</p>
          <p><strong>Date création :</strong> ${
            product.date_creation_produit
              ? new Date(product.date_creation_produit).toLocaleString()
              : ""
          }</p>

          <img 
            src="http://localhost:3000/api/produits/${
              product.id_Produit
            }/codebarre" 
            alt="barcode" 
          />

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 700);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

 const handlePrintAllBarcodes = async () => {
  let allUnits = [];

  for (const product of products) {
    const units = await getProductUnits(product.id_Produit);

    allUnits = [
      ...allUnits,
      ...units.map((u) => ({
        ...u,
        Produit_name: product.Produit_name,
      })),
    ];
  }

  const barcodeCards = allUnits
    .map(
      (u) => `
        <div class="barcode-card">
          <h3>ID Produit : ${u.id_ProduitE}</h3>
          <p>ID Unité : ${u.id_unite}</p>
          <p>${u.Produit_name}</p>
          <img 
            src="http://localhost:3000/api/unites/${u.id_unite}/codebarre" 
            alt="Code barre unité ${u.id_unite}" 
          />
          <p class="code">${u.code_barre13}</p>
        </div>
      `
    )
    .join("");

  const printWindow = window.open("", "_blank");

  printWindow.document.write(`
    <html>
      <head>
        <title>Impression codes-barres unités</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 30px; }
          .container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          .barcode-card {
            border: 1px solid #ccc;
            padding: 15px;
            text-align: center;
            page-break-inside: avoid;
          }
          .barcode-card img {
            margin-top: 10px;
            max-width: 100%;
            height: 90px;
            object-fit: contain;
          }
          .code { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Codes-barres des unités produits</h1>
        <div class="container">
          ${barcodeCards}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 700);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

  const handlePrintAll = () => {
    const printedBy = user?.username || "Utilisateur inconnu";

    const rows = products
      .map(
        (p) => `
          <tr>
            <td>${p.Produit_name}</td>
            <td>${p.descrition_produit || ""}</td>
            <td>${p.prix}</td>
            <td>${p.quantite_stock}</td>
            <td>${p.name_categorie || p.categorie_ID}</td>
            <td>${p.code_barre13 || ""}</td>
            <td>${
              p.date_creation_produit
                ? new Date(p.date_creation_produit).toLocaleString()
                : ""
            }</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport général produits</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #1e293b; color: white; }
            h1 { margin-bottom: 10px; }
            .meta { margin-bottom: 20px; color: #444; }
          </style>
        </head>

        <body>
          <h1>Rapport général des produits</h1>

          <div class="meta">
            <p><strong>Date d'impression :</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Imprimé par :</strong> ${printedBy}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Description</th>
                <th>Prix</th>
                <th>Stock</th>
                <th>Catégorie</th>
                <th>EAN-13</th>
                <th>Date création</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 700);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Espace principal</h1>

        <div className="flex items-center gap-4">
          <span className="text-sm">
            {user ? `Connecté : ${user.username}` : "Utilisateur"}
          </span>

          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-slate-800 rounded-2xl py-5 px-6 shadow-lg">
          <h2 className="text-white text-center text-xl font-bold uppercase tracking-wide">
            Supermarché - Gestion des produits
          </h2>
        </div>

        {message && (
          <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        <ProductForm onSubmit={handleAddProduct} />

        {loadingList ? (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-slate-500">Chargement des produits...</p>
          </div>
        ) : (
          <>
            <ProductList
              products={products}
              onDelete={handleDeleteProduct}
              onEdit={setSelectedProduct}
              onPrintOne={handlePrintOne}
            />

            <div className="flex flex-col md:flex-row justify-end gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl shadow font-semibold"
              >
                Importer un code-barres
              </button>

              <button
                onClick={handlePrintAllBarcodes}
                className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl shadow font-semibold"
              >
                Printer codes-barres
              </button>

              <button
                onClick={handlePrintAll}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl shadow font-semibold"
              >
                Imprimer le rapport général
              </button>
            </div>
          </>
        )}
      </div>

      <EditProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSave={handleSaveEdit}
      />

      {showImportModal && (
        <BarcodeImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}