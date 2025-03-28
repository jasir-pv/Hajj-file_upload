"use client";

import React, { useState } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';

type Advisory = {
  id: string;
  title: string;
  date: string;
  description: string;
};

const TravelAdvisories = () => {
  const [advisories, setAdvisories] = useState<Advisory[]>([
    {
      id: "1",
      title: "Saudi Arabia",
      date: "May 12, 2024",
      description: "Visa processing times have been reduced for Hajj pilgrims.",
    },
    {
      id: "2",
      title: "Health Advisory",
      date: "May 3, 2024",
      description: "Vaccination requirements updated for Hajj 2024.",
    }
  ]);

  const [newAdvisory, setNewAdvisory] = useState({
    title: "",
    date: "",
    description: ""
  });

  const [showForm, setShowForm] = useState(false);

  const handleAddAdvisory = () => {
    if (!newAdvisory.title || !newAdvisory.description) return;

    const advisory: Advisory = {
      id: Date.now().toString(),
      ...newAdvisory
    };

    setAdvisories([...advisories, advisory]);
    setNewAdvisory({ title: "", date: "", description: "" });
    setShowForm(false);
  };

  const handleRemoveAdvisory = (id: string) => {
    setAdvisories(advisories.filter(advisory => advisory.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Travel Advisories</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
        >
          <MdAdd size={18} />
          Add Advisory
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="space-y-2">
            <input
              type="text"
              value={newAdvisory.title}
              onChange={(e) => setNewAdvisory({...newAdvisory, title: e.target.value})}
              placeholder="Advisory Title"
              className="w-full p-2 border rounded text-gray-700"
              required
            />
            <input
              type="text"
              value={newAdvisory.date}
              onChange={(e) => setNewAdvisory({...newAdvisory, date: e.target.value})}
              placeholder="Date (e.g., May 12, 2024)"
              className="w-full p-2 border rounded text-gray-700"
            />
            <textarea
              value={newAdvisory.description}
              onChange={(e) => setNewAdvisory({...newAdvisory, description: e.target.value})}
              placeholder="Advisory details"
              className="w-full p-2 border rounded h-24 text-gray-700"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddAdvisory}
              disabled={!newAdvisory.title || !newAdvisory.description}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              Save Advisory
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {advisories.map((advisory) => (
          <div key={advisory.id} className="border-b pb-4 last:border-b-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-800">{advisory.title}</h3>
                {advisory.date && (
                  <p className="text-gray-600 text-sm">{advisory.date}</p>
                )}
                <p className="text-gray-700 mt-1">{advisory.description}</p>
              </div>
              <button
                onClick={() => handleRemoveAdvisory(advisory.id)}
                className="text-red-500 hover:text-red-700"
              >
                <MdClose size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TravelAdvisories;