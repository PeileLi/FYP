import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./home";
import Login from "./login";
import Register from "./register";
import CreateCampaign from "./CreateCampaign";
import Settings from "./Settings";
import Profile from "./Profile";
import DonationHistory from "./DonationHistory";
import Layout from "./Layout";
import "./App.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-campaign" element={<CreateCampaign />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/donation-history" element={<DonationHistory />} />
      </Routes>
    </Layout>
  );
}

export default App;