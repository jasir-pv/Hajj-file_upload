"use client";

import React, { useState, useEffect } from 'react';
import { MdAdd, MdDelete, MdList, MdEdit } from 'react-icons/md';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { signInAnonymousUser } from "../utils/firebase";

const firestore = getFirestore();

type AdvisoryItem = {
  id: string;
  title: string;
  date: string;
  description: string;
  timestamp: string;
  folderId: number;
  order:number;
};

const TravelAdvisories = () => {
  const [advisories, setAdvisories] = useState<AdvisoryItem[]>([]);
  const [newAdvisory, setNewAdvisory] = useState({
    title: "",
    date: "",
    description: ""
  });
  const [editingAdvisory, setEditingAdvisory] = useState<AdvisoryItem | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showList, setShowList] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<number>(1);
  const [order, setOrder] = useState<number>(0);

  const cancelEdit = () => {
    setEditingAdvisory(null);
    setIsEditing(false);
    setError("");
  };

  useEffect(() => {
    signInAnonymousUser().catch(() => {
      setError("Authentication failed. Operations may not work properly.");
    });
    fetchAllAdvisories();
  }, []);

  const fetchAllAdvisories = async () => {
    setIsLoading(true);
    try {
      const advisoriesCollection = collection(firestore, 'travel_advisories');
      const querySnapshot = await getDocs(advisoriesCollection);
      
      const allAdvisories: AdvisoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AdvisoryItem;
        allAdvisories.push({
          id: doc.id,
          title: data.title,
          date: data.date,
          description: data.description,
          timestamp: data.timestamp,
          order:data.order,
          folderId: data.folderId || (allAdvisories.length + 1) // Fallback to length if not set
        });
      });
      
      // Sort advisories by folderId (ascending)
      allAdvisories.sort((a, b) => a.folderId - b.folderId);
      setAdvisories(allAdvisories);
    } catch (err) {
      console.error("Error fetching advisories:", err);
      setError("Failed to load advisories");
    } finally {
      setIsLoading(false);
    }
  };

  const getNextFolderId = () => {
    if (advisories.length === 0) return 1;
    const maxId = Math.max(...advisories.map(adv => adv.folderId));
    return maxId + 1;
  };

  const handleAddAdvisory = async () => {
    if (!newAdvisory.title || !newAdvisory.date || !newAdvisory.description) {
      setError("Please fill all fields");
      return;
    }

    try {
      // Get the next folder ID (sequential)
      const nextFolderId = advisories.length > 0 
        ? Math.max(...advisories.map(a => a.folderId)) + 1 
        : 1;
  
      // Create advisory data
      const advisoryData = {
        title: newAdvisory.title,
        date: newAdvisory.date,
        description: newAdvisory.description,
        timestamp: new Date().toISOString(),
        folderId: nextFolderId,
        order:order,
      };
  
      // Create document with folderId as the document ID
      const contentRef = doc(collection(firestore, 'travel_advisories'), `${nextFolderId}`);
      console.log(`${nextFolderId}`)
      await setDoc(contentRef, advisoryData);
  
      // Refresh data
      await fetchAllAdvisories();
      
      // Reset form
      setNewAdvisory({
        title: "",
        date: "",
        description: "",
        
      });
      setOrder(0)
      setError("");
    } catch (error) {
      console.error("Error adding advisory:", error);
      setError("Failed to add advisory");
    }
  };

  const handleEditAdvisory = (advisory: AdvisoryItem) => {
    setEditingAdvisory(advisory);
    setIsEditing(true);
    setShowList(false);
    setOrder(advisory.order)
  };

  const handleUpdateAdvisory = async () => {
    if (!editingAdvisory || !editingAdvisory.id) return;
    
    if (!editingAdvisory.title || !editingAdvisory.date || !editingAdvisory.description) {
      setError("Please fill all fields");
      return;
    }

    try {
      // Update data for Firestore (keeping the original folderId)
      const advisoryData = {
        title: editingAdvisory.title,
        date: editingAdvisory.date,
        description: editingAdvisory.description,
        timestamp: editingAdvisory.timestamp, // Keep original timestamp
        folderId: editingAdvisory.folderId,
        order:order
      };

      // Update in Firestore
      await updateDoc(doc(firestore, 'travel_advisories', editingAdvisory.id), advisoryData);

      // Refresh the advisories list
      await fetchAllAdvisories();
      
      // Reset editing state
      cancelEdit();
    } catch (error) {
      console.error("Error updating advisory:", error);
      setError("Failed to update advisory");
    }
  };

  const handleDeleteAdvisory = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this advisory?")) return;

    try {
      // Delete document from Firestore
      await deleteDoc(doc(firestore, 'travel_advisories', id));
      
      // Update local state
      setAdvisories(advisories.filter(advisory => advisory.id !== id));
    } catch (error) {
      console.error("Error deleting advisory:", error);
      setError("Failed to delete advisory");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Travel Advisories</h1>
        <button
          onClick={() => setShowList(!showList)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <MdList size={20} />
          {showList ? "Add Advisories" : "Show List"}
        </button>
      </div>

      {showList ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">All Travel Advisories</h2>
          {isLoading ? (
            <div className="text-center py-4">
              <p>Loading advisories...</p>
            </div>
          ) : advisories.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No advisories available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {advisories.map((advisory) => (
                <div key={advisory.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors relative">
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={() => handleEditAdvisory(advisory)}
                      className="text-blue-500 hover:text-blue-700"
                      aria-label="Edit advisory"
                    >
                      <MdEdit size={20} className=' ' />
                    </button>
                    <button
                      onClick={() => handleDeleteAdvisory(advisory.id)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Delete advisory"
                    >
                      <MdDelete size={20} />
                    </button>
                  </div>
                  
                  <div className='mt-3'>
                    <h3 className="font-medium text-lg text-gray-800">{advisory.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{advisory.date}</p>
                    <p className="text-sm text-gray-600 mb-1">Order: {advisory.order}</p>
                    <p className="text-gray-700 whitespace-pre-line line-clamp-3">{advisory.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add/Edit Advisory Form */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {isEditing ? "Edit Advisory" : "Add New Advisory"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={isEditing ? editingAdvisory?.title || "" : newAdvisory.title}
                  onChange={(e) => isEditing 
                    ? setEditingAdvisory({...editingAdvisory!, title: e.target.value})
                    : setNewAdvisory({...newAdvisory, title: e.target.value})}
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={isEditing ? editingAdvisory?.date || "" : newAdvisory.date}
                  onChange={(e) => isEditing 
                    ? setEditingAdvisory({...editingAdvisory!, date: e.target.value})
                    : setNewAdvisory({...newAdvisory, date: e.target.value})}
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Display order */}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers will appear first in the list</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={isEditing ? editingAdvisory?.description || "" : newAdvisory.description}
                  onChange={(e) => isEditing 
                    ? setEditingAdvisory({...editingAdvisory!, description: e.target.value})
                    : setNewAdvisory({...newAdvisory, description: e.target.value})}
                  className="w-full p-2 border rounded h-24 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description..."
                />
              </div>

              {isEditing && (
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Folder ID: {editingAdvisory?.folderId}</p>
                </div>
              )}

              {isEditing ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateAdvisory}
                    disabled={!editingAdvisory?.title || !editingAdvisory?.date || !editingAdvisory?.description}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddAdvisory}
                  disabled={!newAdvisory.title || !newAdvisory.date || !newAdvisory.description}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Add Advisory
                </button>
              )}

              {error && (
                <div className="p-2 text-sm text-red-700 bg-red-100 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelAdvisories;