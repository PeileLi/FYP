import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CreateCampaign from "@/pages/CreateCampaign";
import CampaignDetail from "@/pages/CampaignDetail";
import BrowseCampaigns from "@/pages/BrowseCampaigns";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import DonationHistory from "@/pages/DonationHistory";
import MyCampaigns from "@/pages/MyCampaigns";
import BlockchainSearch from "@/pages/BlockchainSearch";
import Layout from "@/layouts/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/assets/App.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/browse-campaigns" element={<BrowseCampaigns />} />
        <Route
          path="/create-campaign"
          element={
            <ProtectedRoute>
              <CreateCampaign />
            </ProtectedRoute>
          }
        />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route
          path="/my-campaigns"
          element={
            <ProtectedRoute>
              <MyCampaigns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donation-history"
          element={
            <ProtectedRoute>
              <DonationHistory />
            </ProtectedRoute>
          }
        />
        <Route path="/blockchain-search" element={<BlockchainSearch />} />
      </Routes>
    </Layout>
  );
}

export default App;
