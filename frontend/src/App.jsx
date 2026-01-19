import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CreateCampaign from "@/pages/CreateCampaign";
import CampaignDetail from "@/pages/CampaignDetail";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import DonationHistory from "@/pages/DonationHistory";
import MyCampaigns from "@/pages/MyCampaigns";
import Layout from "@/layouts/Layout";
import "@/assets/App.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-campaign" element={<CreateCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/my-campaigns" element={<MyCampaigns />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/donation-history" element={<DonationHistory />} />
      </Routes>
    </Layout>
  );
}

export default App;
