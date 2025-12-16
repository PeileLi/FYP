import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./home";
import Login from "./login";
import Register from "./register";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;