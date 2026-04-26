
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const getCategories = async () => {
  const response = await axios.get(`${API_URL}/categories`);
  return response.data;
};