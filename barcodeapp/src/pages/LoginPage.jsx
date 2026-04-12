import React from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { loginUser } from "../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = async (formData) => {
    const data = await loginUser(formData);

    localStorage.setItem("user", JSON.stringify(data.user));

    navigate("/main");
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="bg-slate-800 py-5 px-6">
          <h1 className="text-white text-center text-xl font-bold uppercase tracking-wide">
            Supermarché - Espace Gestion
          </h1>
        </div>

        <div className="p-8 flex justify-center">
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    </div>
  );
}