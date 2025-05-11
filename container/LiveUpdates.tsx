"use client";

import React, { useState, useEffect } from 'react';
import { MdClose, MdImage, MdAdd, MdDelete, MdList, MdEdit } from 'react-icons/md';
import { ref, uploadBytesResumable, getDownloadURL, getStorage, deleteObject } from "firebase/storage";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { signInAnonymousUser } from "../utils/firebase";
import Image from 'next/image';

const storage = getStorage();
const firestore = getFirestore();

type UpdateItem = {
  id: string;
  title: string;
  date: string;
  description: string;
  imageUrl: string;
  timestamp: string;
  order: number; 
  folderId: number; // Added folderId
};

const LiveUpdates = () => {
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [newUpdate, setNewUpdate] = useState({
    title: "",
    date: "",
    description: ""
  });
  const [editingUpdate, setEditingUpdate] = useState<UpdateItem | null>(null);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingPreviewUrl, setEditingPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showList, setShowList] = useState(false);
  const [order, setOrder] = useState<number>(0);

  useEffect(() => {
    signInAnonymousUser().catch(() => {
      setError("Authentication failed. Uploads may not work properly.");
    });
    fetchAllUpdates();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (editingPreviewUrl) URL.revokeObjectURL(editingPreviewUrl);
    };
  }, [previewUrl, editingPreviewUrl]);

  const getNextFolderId = () => {
    if (updates.length === 0) return 1;
    return Math.max(...updates.map(update => update.folderId)) + 1;
  };

  const fetchAllUpdates = async () => {
    setIsLoading(true);
    try {
      const updatesCollection = collection(firestore, 'live_updates');
      const querySnapshot = await getDocs(updatesCollection);
      
      const allUpdates: UpdateItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UpdateItem;
        allUpdates.push({
          id: doc.id,
          title: data.title,
          date: data.date,
          description: data.description,
          imageUrl: data.imageUrl,
          timestamp: data.timestamp,
          order: data.order || 0 ,
          folderId: data.folderId || 1 // Default to 1 if not set
        });
      });
      
      // Sort updates by folderId (ascending)
      allUpdates.sort((a, b) =>  a.order - b.order);
      setUpdates(allUpdates);
    } catch (err) {
      console.error("Error fetching updates:", err);
      setError("Failed to load updates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.type.startsWith("image/")) {
        if (isEditing) {
          setEditingImageFile(selectedFile);
          const preview = URL.createObjectURL(selectedFile);
          setEditingPreviewUrl(preview);
        } else {
          setImageFile(selectedFile);
          const preview = URL.createObjectURL(selectedFile);
          setPreviewUrl(preview);
        }
      } else {
        setError("Please select a valid image file.");
      }
    }
  };

  const uploadImage = async (file: File | null): Promise<string | null> => {
    if (!file || !storage) return null;

    try {
      setIsUploading(true);
      const fileExtension = file.name.split('.').pop() || '';
      const cleanFileName = `image_${Date.now()}.${fileExtension}`.toLowerCase();
      const storagePath = `live_updates_images/${cleanFileName}`;
      const storageRef = ref(storage, storagePath);
      
      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

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
    if (!newUpdate.title || !newUpdate.date || !newUpdate.description ) {
      setError("Please fill all fields");
      return;
    }

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          setError("Failed to upload image");
          return;
        }
      }

      const folderId = getNextFolderId();
      
      // Create update data for Firestore
      const updateData = {
        title: newUpdate.title,
        date: newUpdate.date,
        description: newUpdate.description,
        imageUrl: imageUrl || null,
        timestamp: new Date().toISOString(),
        folderId: folderId,
        order:order,
      };

      // Add to Firestore with folderId as document ID
      const contentRef = doc(collection(firestore, 'live_updates'), `${folderId}`);
      await setDoc(contentRef, updateData);

      // Refresh the updates list
      await fetchAllUpdates();
      
      // Reset form
      setNewUpdate({
        title: "",
        date: "",
        description: ""
      });
      setImageFile(null);
      setPreviewUrl(null);
      setOrder(0);
      setError("");
    } catch (error) {
      console.error("Error adding update:", error);
      setError("Failed to add update");
    }
  };

  const handleEditUpdate = (update: UpdateItem) => {
    setEditingUpdate(update);
    setIsEditing(true);
    setEditingPreviewUrl(update.imageUrl || null);
    setShowList(false);
    setOrder(update.order || 0)
  };

  const handleUpdateEdit = async () => {
    if (!editingUpdate || !editingUpdate.id) return;
    
    if (!editingUpdate.title || !editingUpdate.date || !editingUpdate.description) {
      setError("Please fill all fields");
      return;
    }

    try {
      let imageUrl = editingUpdate.imageUrl || null;
      
      // Upload new image if selected
      if (editingImageFile){
        // Delete old image if exists
        if (editingUpdate.imageUrl) {
          try {
            const oldImageRef = ref(storage, editingUpdate.imageUrl);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error("Error deleting old image:", error);
          }
        }
        
        // Upload new image
        imageUrl = await uploadImage(editingImageFile);
        if (!imageUrl) {
          setError("Failed to upload image");
          return;
        }
      }


      const updateData = {
        title: editingUpdate.title,
        date: editingUpdate.date,
        description: editingUpdate.description,
        imageUrl: imageUrl || null,
        timestamp: editingUpdate.timestamp, 
        folderId: editingUpdate.folderId,   
        order: order
      };


      const contentRef = doc(firestore, 'live_updates', `${editingUpdate.folderId}`);
      await updateDoc(contentRef, updateData);


      await fetchAllUpdates();
      

      cancelEdit();
    } catch (error) {
      console.error("Error updating update:", error);
      setError("Failed to update update");
    }
  };

  const cancelEdit = () => {
    setEditingUpdate(null);
    setIsEditing(false);
    setEditingImageFile(null);
    setEditingPreviewUrl(null);
    setError("");
    setOrder(0); 
  };

  const handleDeleteUpdate = async (id: string, imageUrl?: string, folderId?: number) => {
    if (!window.confirm("Are you sure you want to delete this update?")) return;

    try {
      // Delete image from storage if exists
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }

      // Delete document from Firestore using folderId
      if (folderId) {
        await deleteDoc(doc(firestore, 'live_updates', `${folderId}`));
      } else {
        await deleteDoc(doc(firestore, 'live_updates', id));
      }
      
      // Update local state
      setUpdates(updates.filter(update => update.id !== id));
    } catch (error) {
      console.error("Error deleting update:", error);
      setError("Failed to delete update");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Live Updates</h1>
        <button
          onClick={() => setShowList(!showList)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <MdList size={20} />
          {showList ? "Hide List" : "Show List"}
        </button>
      </div>

      {showList ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">All Live Updates</h2>
          {isLoading ? (
            <div className="text-center py-4">
              <p>Loading updates...</p>
            </div>
          ) : updates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No updates available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {updates.map((update) => (
                <div key={update.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors relative">
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={() => handleEditUpdate(update)}
                      className="text-blue-500 hover:text-blue-700"
                      aria-label="Edit update"
                    >
                      <MdEdit size={20} className=' ' />
                    </button>
                    <button
                      onClick={() => handleDeleteUpdate(update.id, update.imageUrl, update.folderId)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Delete update"
                    >
                      <MdDelete size={20} />
                    </button>
                  </div>
                  
                  <div className="w-full flex">
                    {update.imageUrl && (
                      <div className="mb-3">
                        <Image
                          src={update.imageUrl}
                          alt={update.title}
                          width={400}
                          height={300}
                          className="w-auto h-28 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    <div className='mt-3 ml-3'>
                      <h3 className="font-medium text-lg text-gray-800">{update.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{update.date}</p>
                      <p className="text-xs text-gray-400 mb-1">Folder ID: {update.folderId}</p>
                      <p className="text-gray-700 whitespace-pre-line line-clamp-3">{update.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add/Edit Update Form */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {isEditing ? "Edit Update" : "Add New Update"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={isEditing ? editingUpdate?.title || "" : newUpdate.title}
                  onChange={(e) => isEditing 
                    ? setEditingUpdate({...editingUpdate!, title: e.target.value})
                    : setNewUpdate({...newUpdate, title: e.target.value})}
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={isEditing ? editingUpdate?.date || "" : newUpdate.date}
                  onChange={(e) => isEditing 
                    ? setEditingUpdate({...editingUpdate!, date: e.target.value})
                    : setNewUpdate({...newUpdate, date: e.target.value})}
                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., May 15, 2024"
                />
              </div>

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
                  value={isEditing ? editingUpdate?.description || "" : newUpdate.description}
                  onChange={(e) => isEditing 
                    ? setEditingUpdate({...editingUpdate!, description: e.target.value})
                    : setNewUpdate({...newUpdate, description: e.target.value})}
                  className="w-full p-2 border rounded h-24 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description..."
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Image</label>
                <div className="flex flex-col items-center justify-center w-full p-4 border-2 border-dotted border-gray-400 rounded-lg">
                  {(isEditing ? editingPreviewUrl : previewUrl) ? (
                    <div className="relative">
                      <Image
                        src={isEditing ? editingPreviewUrl! : previewUrl!}
                        alt="Selected file preview"
                        width={128}
                        height={128}
                        className="object-cover w-32 h-32 rounded-lg"
                        onClick={() => document.getElementById(isEditing ? "editing-image-input" : "image-input")?.click()}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditing) {
                            setEditingImageFile(null);
                            setEditingPreviewUrl(null);
                          } else {
                            setImageFile(null);
                            setPreviewUrl(null);
                          }
                          setError("");
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                      >
                        <MdClose />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="flex flex-col items-center justify-center h-36 w-full cursor-pointer py-6"
                      onClick={() => document.getElementById(isEditing ? "editing-image-input" : "image-input")?.click()}
                    >
                      <MdImage className="text-gray-400 text-5xl mb-2" />
                      <p className="text-gray-500 text-sm">Upload an image for your update</p>
                      <p className="text-xs text-gray-400 mt-1">This image will be displayed with your update</p>
                    </div>
                  )}
                  <input
                    id={isEditing ? "editing-image-input" : "image-input"}
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
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

              {isEditing ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateEdit}
                    disabled={isUploading || !editingUpdate?.title || !editingUpdate?.date || !editingUpdate?.description || (!editingUpdate?.imageUrl && !editingImageFile) }
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? "Uploading..." : "Update"}
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
                  onClick={handleAddUpdate}
                  disabled={isUploading || !newUpdate.title || !newUpdate.date || !newUpdate.description  || !imageFile }
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? "Uploading..." : "Add Update"}
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

export default LiveUpdates;