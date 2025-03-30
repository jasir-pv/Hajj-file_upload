"use client";

import React, { useState, useEffect } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';
import { ref, uploadBytesResumable, getDownloadURL, getStorage, listAll } from "firebase/storage";
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

  useEffect(() => {
    signInAnonymousUser().catch(() => {
      setError("Authentication failed. Uploads may not work properly.");
    });
  }, []);

  useEffect(() => {
    const fetchHighestFolderId = async () => {
      try {
        const advisoriesRef = ref(storage, 'travel_advisories');
        const result = await listAll(advisoriesRef);
        
        const folderIds = result.prefixes.map(folderRef => {
          const folderName = folderRef.name;
          const folderId = parseInt(folderName, 10);
          return isNaN(folderId) ? 0 : folderId;
        });
        
        const highestId = folderIds.length > 0 ? Math.max(...folderIds) : 0;
        setNextFolderId(highestId + 1);
      } catch (error) {
        console.error("Error fetching folder IDs:", error);
        setNextFolderId(1);
      }
    };
    
    fetchHighestFolderId();
  }, []);

  const saveAdvisoryToFirebase = async (advisory: Advisory): Promise<boolean> => {
    if (!storage) {
      setError("Storage service not available");
      return false;
    }
  
    if (nextFolderId === null) {
      setError("Preparing upload location, please try again in a moment");
      return false;
    }

    try {
      setIsUploading(true);
      const advisoryRef = ref(storage, `travel_advisories/${nextFolderId}/advisory_data.json`);
      const advisoryBlob = new Blob([JSON.stringify(advisory)], { type: 'application/json' });
      
      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(advisoryRef, advisoryBlob);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            setIsUploading(false);
            setError(`Upload failed: ${error.message}`);
            reject(false);
          },
          async () => {
            try {
              await getDownloadURL(uploadTask.snapshot.ref);
              setIsUploading(false);
              setUploadProgress(0);
              resolve(true);
            } catch (error) {
              setIsUploading(false);
              setError("Failed to get download URL");
              reject(false);
            }
          }
        );
      });
    } catch (err) {
      setIsUploading(false);
      setError("Failed to start upload");
      console.error(err);
      return false;
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
      setAdvisories([...advisories, advisory]);
      setNewAdvisory({ title: "", date: "", description: "" });
      setShowForm(false);
      setError("");
      setNextFolderId(prevId => prevId !== null ? prevId + 1 : 1);
    }
  };

  const handleRemoveAdvisory = (id: string) => {
    setAdvisories(advisories.filter(advisory => advisory.id !== id));
    // Note: This only removes from local state. You might want to also delete from Firebase Storage.
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

      <div className="space-y-4">
        {advisories.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No advisories available</p>
        ) : (
          advisories.map((advisory) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default TravelAdvisories;