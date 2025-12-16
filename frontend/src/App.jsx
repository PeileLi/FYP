import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./home";
import Login from "./login";
import Register from "./register";
import CreateCampaign from "./CreateCampaign";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/create-campaign" element={<CreateCampaign />} />
    </Routes>
  );
}

export default App;