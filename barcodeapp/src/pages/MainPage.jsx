import React from "react";
import { useNavigate } from "react-router-dom";

export default function MainPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100">
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

      <div className="p-8">
        
      </div>
    </div>
  );
}