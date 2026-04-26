import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
// Plus tard pour déploiement :
// const API_URL = import.meta.env.VITE_API_URL;

export const createProduct = async (productData) => {
  const response = await axios.post(`${API_URL}/produits`, productData);
  return response.data;
};

export const getProducts = async () => {
  const response = await axios.get(`${API_URL}/produits`);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await axios.put(`${API_URL}/produits/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id, id_user) => {
  const response = await axios.delete(`${API_URL}/produits/${id}`, {
    data: { id_user },
  });

  return response.data;
};

export const getBarcodeImageUrl = (id) => {
  return `${API_URL}/produits/${id}/codebarre`;
};

// récupérer toutes les unités/codes-barres d’un produit
export const getProductUnits = async (idProduit) => {
  const response = await axios.get(`${API_URL}/produits/${idProduit}/unites`);
  return response.data;
};

//  image du code-barres d’une unité précise
export const getUnitBarcodeImageUrl = (idUnite) => {
  return `${API_URL}/unites/${idUnite}/codebarre`;
};