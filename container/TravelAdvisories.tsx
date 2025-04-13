"use client";

import React, { useState, useEffect } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';
import { ref, uploadBytesResumable, getDownloadURL, getStorage, listAll, deleteObject } from "firebase/storage";
import { signInAnonymousUser } from "../utils/firebase";

const storage = getStorage();

type Advisory = {
  id: string;
  title: string;
  date: string;
  description: string;
};

const TravelAdvisories = () => {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [newAdvisory, setNewAdvisory] = useState({
    title: "",
    date: "",
    description: ""
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [nextFolderId, setNextFolderId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdvisories = async () => {
    try {
      setIsLoading(true);
      setError("");
      const advisoriesRef = ref(storage, 'travel_advisories');
      const result = await listAll(advisoriesRef);
      
      const advisoryPromises = result.prefixes.map(async (folderRef) => {
        try {
          const advisoryFileRef = ref(storage, `${folderRef.fullPath}/advisory_data.json`);
          const url = await getDownloadURL(advisoryFileRef);
          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch advisory');
          const data = await response.json();
          return data;
        } catch (error) {
          console.error(`Error loading advisory from ${folderRef.name}:`, error);
          return null;
        }
      });

      const loadedAdvisories = (await Promise.all(advisoryPromises)).filter(Boolean);
      setAdvisories(loadedAdvisories);
    } catch (error) {
      console.error("Error fetching advisories:", error);
      setError("Failed to load advisories. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await signInAnonymousUser();
        await fetchAdvisories();
        
        // Get next folder ID
        const advisoriesRef = ref(storage, 'travel_advisories');
        const result = await listAll(advisoriesRef);
        const folderIds = result.prefixes.map(folderRef => {
          const id = parseInt(folderRef.name, 10);
          return isNaN(id) ? 0 : id;
        });
        setNextFolderId(folderIds.length > 0 ? Math.max(...folderIds) + 1 : 1);
      } catch (error) {
        console.error("Initialization error:", error);
        setError("Initialization failed. Please refresh the page.");
      }
    };

    initialize();
  }, []);

  const saveAdvisoryToFirebase = async (advisory: Advisory) => {
    if (!nextFolderId) {
      setError("System not ready. Please try again.");
      return false;
    }

    try {
      setIsUploading(true);
      setError("");
      const advisoryRef = ref(storage, `travel_advisories/${nextFolderId}/advisory_data.json`);
      const blob = new Blob([JSON.stringify(advisory)], { type: 'application/json' });
      
      await new Promise<void>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(advisoryRef, blob);
        uploadTask.on('state_changed',
          (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          (error) => reject(error),
          () => resolve()
        );
      });

      return true;
    } catch (error) {
      console.error("Upload error:", error);
      setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddAdvisory = async () => {
    if (!newAdvisory.title || !newAdvisory.description) {
      setError("Title and description are required");
      return;
    }

    const advisory: Advisory = {
      id: Date.now().toString(),
      ...newAdvisory
    };

    const success = await saveAdvisoryToFirebase(advisory);
    if (success) {
      setNewAdvisory({ title: "", date: "", description: "" });
      await fetchAdvisories(); // Refresh the list
      setShowForm(false);
      setNextFolderId(prev => (prev || 0) + 1);
    }
  };

  const handleRemoveAdvisory = async (id: string) => {
    try {
      const advisoriesRef = ref(storage, 'travel_advisories');
      const result = await listAll(advisoriesRef);
      
      for (const folderRef of result.prefixes) {
        try {
          const fileRef = ref(storage, `${folderRef.fullPath}/advisory_data.json`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          const advisory = await response.json();
          
          if (advisory.id === id) {
            await deleteObject(fileRef);
            setAdvisories(prev => prev.filter(a => a.id !== id));
            return;
          }
        } catch (error) {
          console.error(`Error processing folder ${folderRef.name}:`, error);
        }
      }
      setError("Advisory not found");
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete advisory");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Travel Advisories</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          disabled={isUploading}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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

          {uploadProgress > 0 && (
            <div className="pt-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-blue-600">Uploading...</span>
                <span className="text-sm font-medium text-blue-600">{uploadProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-2 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddAdvisory}
              disabled={!newAdvisory.title || !newAdvisory.description || isUploading}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isUploading ? "Saving..." : "Save Advisory"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
              disabled={isUploading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading advisories...</p>
        </div>
      ) : advisories.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">No advisories available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {advisories.map((advisory) => (
            <div key={advisory.id} className="border-b border-gray-300 pb-4 last:border-b-0">
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
      )}
    </div>
  );
};

export default TravelAdvisories;