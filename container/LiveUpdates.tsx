"use client";

import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from "firebase/storage";
import Image from 'next/image';
import { title } from 'process';

type UpdateItem = {
  id: string;
  title: string;
  date: string;
  description: string;
  imageUrl?: string;
};



const storage = getStorage()

const LiveUpdates = () => {
  const [updates, setUpdates] = useState<UpdateItem[]>([
    {
      id: "1",
      title: "Hajj 2024 Registration Opens",
      date: "May 15, 2024",
      description: "The Ministry of Hajj and Umrah has announced the opening of registration for Hajj 2024.",
      imageUrl: "/live-update.jpg" // Sample image URL
    }
  ]);
  const [newUpdate, setNewUpdate] = useState({
    title: "",
    date: "",
    description: ""
  });
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.type.startsWith("image/")) {
        setImageFile(selectedFile);
        const preview = URL.createObjectURL(selectedFile);
        setPreviewUrl(preview);
      } else {
        setError("Please select a valid image file.");
      }
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      setIsUploading(true);
      const storagePath = `updates/${title}`;
      const storageRef = ref(storage, storagePath);
      
      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, imageFile);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            setIsUploading(false);
            setError(`Upload failed: ${error.message}`);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setIsUploading(false);
              setUploadProgress(0);
              resolve(downloadURL);
            } catch (error) {
              setIsUploading(false);
              setError("Failed to get download URL");
              reject(error);
            }
          }
        );
      });
    } catch (err) {
      setIsUploading(false);
      setError("Failed to start upload");
      console.error(err);
      return null;
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.title || !newUpdate.date || !newUpdate.description) {
      setError("Please fill all fields");
      return;
    }

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const updateItem: UpdateItem = {
        id: Date.now().toString(),
        ...newUpdate,
        imageUrl: imageUrl || undefined
      };

      setUpdates([updateItem, ...updates]);
      setNewUpdate({
        title: "",
        date: "",
        description: ""
      });
      setImageFile(null);
      setPreviewUrl(null);
      setError("");
    } catch (error) {
      console.error("Error adding update:", error);
    }
  };

  const handleDeleteUpdate = (id: string) => {
    setUpdates(updates.filter(update => update.id !== id));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Live Updates</h1>

      {/* Add New Update Form */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Update</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={newUpdate.title}
              onChange={(e) => setNewUpdate({...newUpdate, title: e.target.value})}
              className="w-full p-2 border rounded text-gray-700 text-sm"
              placeholder="Enter title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="text"
              value={newUpdate.date}
              onChange={(e) => setNewUpdate({...newUpdate, date: e.target.value})}
              className="w-full p-2 border rounded text-gray-700 text-sm"
              placeholder="e.g., May 15, 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newUpdate.description}
              onChange={(e) => setNewUpdate({...newUpdate, description: e.target.value})}
              className="w-full p-2 border rounded h-24 text-gray-700 text-sm"
              placeholder="Enter description..."
            />
          </div>

          {/* Image Upload Section */}
           <div className="flex flex-col items-center justify-center w-full p-4 border-2 border-dotted border-gray-400 rounded-lg">
                  {previewUrl ? (
                    <div className="relative">
                      <Image
                        src={previewUrl}
                        alt="Selected file preview"
                        width={128}
                        height={128}
                        className="object-cover w-32 h-32 rounded-lg"
                        onClick={() => document.getElementById("image-input")?.click()}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                          setPreviewUrl(null);
                          setError("");
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                      >
                        <MdClose />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Image
                        src="/add-image.png"
                        alt="Upload Placeholder"
                        width={64}
                        height={64}
                        className="w-16 h-16 opacity-50"
                        onClick={() => document.getElementById("image-input")?.click()}
                      />
                      <p className="text-gray-500 text-sm mt-2">Upload Image</p>
                    </div>
                  )}
                  <input
                    id="image-input"
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
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

          <button
            onClick={handleAddUpdate}
            disabled={isUploading || !newUpdate.title || !newUpdate.date || !newUpdate.description}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? "Uploading..." : "Add Update"}
          </button>

          {error && (
            <div className="p-2 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Updates List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Updates</h2>
        {updates.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No updates available</p>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    {update.imageUrl && (
                      <div className="mb-3">
                        <img
                          src={update.imageUrl}
                          alt={update.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <h3 className="font-medium text-lg text-gray-800">{update.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{update.date}</p>
                    <p className="text-gray-700">{update.description}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteUpdate(update.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                    aria-label="Delete update"
                  >
                    <MdClose size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    
    </div>
  );
};

export default LiveUpdates;