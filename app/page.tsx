"use client";

import { useState } from "react";
import LiveUpdates from "@/container/LiveUpdates";
import FileUpload from "@/container/FileUpload";
import UpcomingEvents from "@/container/UpcomingEvents";
import TravelAdvisories from "@/container/TravelAdvisories";
import HistoricPlaces from "@/container/HistoricPlaces";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("file-upload");

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
         
          <button
            onClick={() => setActiveTab("file-upload")}
            className={`px-2 py-1 rounded-md text-xs ${
              activeTab === "file-upload"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            File Upload
          </button>

          <button
            onClick={() => setActiveTab("historic-places")}
            className={`px-2 py-1 rounded-md text-xs ${
              activeTab === "historic-places"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Historic Places
          </button>

          <button
            onClick={() => setActiveTab("live-updates")}
            className={`px-2 py-1 rounded-md text-xs ${
              activeTab === "live-updates"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Live Updates
          </button>

          <button
            onClick={() => setActiveTab("upcoming-events")}
            className={`px-2 py-1 rounded-md text-xs ${
              activeTab === "upcoming-events"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Upcoming Events
          </button>
          <button
            onClick={() => setActiveTab("travel-advisory")}
            className={`px-2 py-1 rounded-md text-xs ${
              activeTab === "travel-advisory"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Travel Advisories
          </button>


        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {activeTab === "file-upload" && <FileUpload />}
          {activeTab === "live-updates" && <LiveUpdates />}
          {activeTab === "upcoming-events" && <UpcomingEvents />}
          {activeTab === "travel-advisories" && <TravelAdvisories />}
          {activeTab === "historic-places" && <HistoricPlaces />}
        </div>
      </div>
    </div>
  );
}