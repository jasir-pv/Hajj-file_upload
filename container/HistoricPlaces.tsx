"use client";
  
import { useState, useEffect } from "react";
import { ref, uploadBytesResumable, getDownloadURL, getStorage, listAll } from "firebase/storage";
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";
import { signInAnonymousUser } from "../utils/firebase";
import { MdClose, MdImage, MdAdd, MdDelete } from "react-icons/md";
import Image from "next/image";

const storage = getStorage()
const firestore = getFirestore()

interface ParagraphItem {
  title: string;
  description: string[];
}

interface ContentData {
  name: string;
  description: string[];
  paragraphs: ParagraphItem[];
  content_image?: string;
  location_link: string;
  category: "makkah" | "madina";
}

type TabType = "makkah" | "madina";

const HistoricPlaces = () => {
    const [activeTab, setActiveTab] = useState<TabType>("makkah");
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [contentImageFile, setContentImageFile] = useState<File | null>(null);
    const [otherFiles, setOtherFiles] = useState<File[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState<string[]>([""]);
    const [paragraphs, setParagraphs] = useState<ParagraphItem[]>([
      { title: "", description: [""] }
    ]);
    const [audioFiles, setAudioFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [contentImagePreview, setContentImagePreview] = useState<string | null>(null);
    const [makkahFolderId, setMakkahFolderId] = useState<number | null>(null);
    const [madinaFolderId, setMadinaFolderId] = useState<number | null>(null);
    const [locationLink, setLocationLink] = useState("");
  
    const getCurrentFolderId = () => {
      switch (activeTab) {
        case "makkah": return makkahFolderId;
        case "madina": return madinaFolderId;
        default: return null;
      }
    };
  
    const setCurrentFolderId = (id: number) => {
      switch (activeTab) {
        case "makkah": setMakkahFolderId(id); break;
        case "madina": setMadinaFolderId(id); break;
      }
    };
  
    useEffect(() => {
      signInAnonymousUser().catch(() => {
        setError("Authentication failed. Uploads may not work properly.");
      });
    }, []);
  
    useEffect(() => {
      return () => {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
      };
    }, [previewUrls]);
  
    useEffect(() => {
      fetchFolderIds();
    }, []);
    
    const fetchFolderIds = async () => {
      await fetchFolderIdForCategory("makkah");
      await fetchFolderIdForCategory("madina");
    };
    
    const fetchFolderIdForCategory = async (category: TabType) => {
      try {
        const categoryRef = ref(storage, `historic_places/${category}`);
        const result = await listAll(categoryRef);
        
        const folderIds = result.prefixes.map(folderRef => {
          const folderName = folderRef.name;
          const folderId = parseInt(folderName, 10);
          return isNaN(folderId) ? 0 : folderId;
        });
        
        const highestId = folderIds.length > 0 ? Math.max(...folderIds) : 0;
        
        if (category === "makkah") {
          setMakkahFolderId(highestId + 1);
        } else {
          setMadinaFolderId(highestId + 1);
        }
      } catch (error) {
        console.error(`Error fetching folder IDs for ${category}:`, error);
        if (category === "makkah") {
          setMakkahFolderId(1);
        } else {
          setMadinaFolderId(1);
        }
      }
    };

    // ... [keep all other existing functions unchanged, just update the storage paths]

    useEffect(() => {
        return () => {
          if (contentImagePreview) {
            URL.revokeObjectURL(contentImagePreview);
          }
        };
      }, [contentImagePreview]);
    
      const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError("");
        if (e.target.files && e.target.files.length > 0) {
          const newImageFiles: File[] = [];
          const newPreviewUrls: string[] = [];
          
          Array.from(e.target.files).forEach(file => {
            if (file.type.startsWith("image/")) {
              newImageFiles.push(file);
              const preview = URL.createObjectURL(file);
              newPreviewUrls.push(preview);
            } else {
              setError("Please select valid image files only.");
            }
          });
          
          setImageFiles([...imageFiles, ...newImageFiles]);
          setPreviewUrls([...previewUrls, ...newPreviewUrls]);
        }
      };
    
      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError("");
        if (e.target.files && e.target.files.length > 0) {
          const selectedFiles = Array.from(e.target.files);
          setOtherFiles([...otherFiles, ...selectedFiles]);
        }
      };
    
      const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError("");
        if (e.target.files && e.target.files.length > 0) {
          const newAudioFiles: File[] = [];
          
          Array.from(e.target.files).forEach(file => {
            if (file.type.startsWith('audio/')) {
              newAudioFiles.push(file);
            } else {
              setError("Please select audio files only");
            }
          });
          
          setAudioFiles([...audioFiles, ...newAudioFiles]);
        }
      };
      
      const removeImage = (index: number) => {
        const newImageFiles = [...imageFiles];
        const newPreviewUrls = [...previewUrls];
        
        URL.revokeObjectURL(newPreviewUrls[index]);
        
        newImageFiles.splice(index, 1);
        newPreviewUrls.splice(index, 1);
        
        setImageFiles(newImageFiles);
        setPreviewUrls(newPreviewUrls);
      };
    
      const handleContentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError("");
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          if (file.type.startsWith("image/")) {
            // Revoke previous preview URL if it exists
            if (contentImagePreview) {
              URL.revokeObjectURL(contentImagePreview);
            }
            
            setContentImageFile(file);
            const preview = URL.createObjectURL(file);
            setContentImagePreview(preview);
          } else {
            setError("Please select a valid image file for content image.");
          }
        }
      };
      
      const removeContentImage = () => {
        if (contentImagePreview) {
          URL.revokeObjectURL(contentImagePreview);
        }
        setContentImageFile(null);
        setContentImagePreview(null);
      };
    
      // Description array handlers
      const handleDescriptionChange = (index: number, value: string) => {
        const newDescription = [...description];
        newDescription[index] = value;
        setDescription(newDescription);
      };
      
      const addDescriptionField = () => {
        setDescription([...description, ""]);
      };
      
      const removeDescriptionField = (index: number) => {
        const newDescription = [...description];
        newDescription.splice(index, 1);
        setDescription(newDescription);
      };
      
      // Paragraph handlers
      const handleParagraphTitleChange = (index: number, value: string) => {
        const newParagraphs = [...paragraphs];
        newParagraphs[index].title = value;
        setParagraphs(newParagraphs);
      };
      
      const handleParagraphDescriptionChange = (paraIndex: number, descIndex: number, value: string) => {
        const newParagraphs = [...paragraphs];
        newParagraphs[paraIndex].description[descIndex] = value;
        setParagraphs(newParagraphs);
      };
      
      const addParagraph = () => {
        setParagraphs([...paragraphs, { title: "", description: [""] }]);
      };
      
      const removeParagraph = (index: number) => {
        const newParagraphs = [...paragraphs];
        newParagraphs.splice(index, 1);
        setParagraphs(newParagraphs);
      };
      
      const addParagraphDescription = (paraIndex: number) => {
        const newParagraphs = [...paragraphs];
        newParagraphs[paraIndex].description.push("");
        setParagraphs(newParagraphs);
      };
      
      const removeParagraphDescription = (paraIndex: number, descIndex: number) => {
        const newParagraphs = [...paragraphs];
        newParagraphs[paraIndex].description.splice(descIndex, 1);
        setParagraphs(newParagraphs);
      };

    const handleUpload = async () => {
        if (imageFiles.length === 0 && otherFiles.length === 0 && audioFiles.length === 0 && 
            !contentImageFile && !name.trim() && description.every(d => !d.trim()) && 
            paragraphs.every(p => !p.title.trim() && p.description.every(d => !d.trim()))) {
          setError("Please select files or enter content to upload");
          return;
        }
    
        if (!storage) {
          setError("Storage service not available");
          return;
        }
      
        const currentFolderId = getCurrentFolderId();
        
        if (currentFolderId === null) {
          setError("Preparing upload location, please try again in a moment");
          return;
        }
    
        try {
          const filesToUpload: {file: File, type: string}[] = [];
          
          imageFiles.forEach(file => filesToUpload.push({file, type: "image"}));
          otherFiles.forEach(file => filesToUpload.push({file, type: "file"}));
          audioFiles.forEach(file => filesToUpload.push({file, type: "audio"}));
          
          // Check if we have any content to store
          const hasContent = name.trim() || 
                             description.some(d => d.trim()) || 
                             paragraphs.some(p => p.title.trim() || p.description.some(d => d.trim()));
          
          let contentImageUrl: string | null = null;
          
          // Upload content image first if exists
          if (contentImageFile) {
            const fileExtension = contentImageFile.name.split('.').pop() || '';
            const timestamp = new Date().getTime();
            const cleanFileName = `content_image_${timestamp}.${fileExtension}`.toLowerCase();
        
      const storagePath = `historic_places_${activeTab}/${currentFolderId}/${cleanFileName}`;
      const storageRef = ref(storage, storagePath);
      
      try {
        const uploadTask = uploadBytesResumable(storageRef, contentImageFile);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(progress);
            },
            (error) => {
              setError(`Content image upload failed: ${error.message}`);
              reject(error);
            },
            async () => {
              contentImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      } catch (error) {
        console.error("Failed to upload content image:", error);
        return;
      }
    }
    
    // Store structured content in Firestore
    if (hasContent || contentImageUrl) {
      try {
        // Clean up data by removing empty entries
        const cleanDescription = description.filter(d => d.trim());
        
        const cleanParagraphs = paragraphs
          .filter(p => p.title.trim() || p.description.some(d => d.trim()))
          .map(p => ({
            title: p.title,
            description: p.description.filter(d => d.trim())
          }));
      const collectionName = `historic_places_${activeTab}`;
       const contentRef = doc(collection(firestore, collectionName), `${currentFolderId}`);
       const contentData: ContentData = {
                    name: name.trim(),
                    description: cleanDescription,
                    paragraphs: cleanParagraphs,
                    category: activeTab,
                    location_link: locationLink,
                  };
                  
                  if (contentImageUrl) {
                    contentData.content_image = contentImageUrl;
                  }
                  
                  await setDoc(contentRef, {
                    ...contentData,
                    timestamp: new Date().toISOString(),
                    folderId: currentFolderId,
                    hasFiles: filesToUpload.length > 0
                  });
                  
                  // Also store a reference to the content in the storage folder
                  if (filesToUpload.length > 0) {
                    const contentMetaRef = ref(storage, `${activeTab}/${currentFolderId}/content_metadata.json`);
                    const metaBlob = new Blob([JSON.stringify({
                      hasContent: true,
                      firestoreCollection: collectionName,
                      firestoreDocId: `${currentFolderId}`
                    })], { type: 'application/json' });
                    await uploadBytesResumable(contentMetaRef, metaBlob);
                  }
                } catch (error) {
                  console.error("Error storing content in Firestore:", error);
                  setError("Failed to store content");
                  return;
                }
              }
              
              if (filesToUpload.length === 0) {
                alert("Content saved successfully!");
                setError("");
                // Increment folder ID for the NEXT upload operation
                setCurrentFolderId(currentFolderId + 1);
                resetForm();
                return;
              } 
              
              let completedUploads = 0;
              const totalFiles = filesToUpload.length;
              
              for (const {file, type} of filesToUpload) {
                const fileExtension = file.name.split('.').pop() || '';
                const timestamp = new Date().getTime() + filesToUpload.indexOf({file, type});
                const cleanFileName = `${type}_${timestamp}.${fileExtension}`.toLowerCase();
                
                const storagePath = `${activeTab}/${currentFolderId}/${cleanFileName}`;
                const storageRef = ref(storage, storagePath);
                
                const uploadTask = uploadBytesResumable(storageRef, file);
                
                uploadTask.on(
                  "state_changed",
                  (snapshot) => {
                    const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes);
                    const overallProgress = ((completedUploads + fileProgress) / totalFiles) * 100;
                    setProgress(overallProgress);
                  },
                  (error) => {
                    setError(`Upload failed: ${error.message}`);
                    setProgress(0);
                  },
                  async () => {
                    completedUploads++;
                    
                    if (completedUploads === totalFiles) {
                      alert("All uploads successful!");
                      setError("");
                      // Increment folder ID for the next upload
                      setCurrentFolderId(currentFolderId + 1);
                      
                      setImageFiles([]);
                      setOtherFiles([]);
                      setAudioFiles([]);
                      setPreviewUrls([]);
                      setName("");
                      setDescription([""]);
                      setParagraphs([{ title: "", description: [""] }]);
                      removeContentImage();
                      setProgress(0);
                    }
                  }
                );
              }
            } catch (err) {
              setError("Failed to start upload");
              console.error(err);
            }
          };
          
          const resetForm = () => {
            setName("");
            setDescription([""]);
            setParagraphs([{ title: "", description: [""] }]);
            setImageFiles([]);
            setOtherFiles([]);
            setAudioFiles([]);
            setPreviewUrls([]);
            setLocationLink("");
            removeContentImage();
            setProgress(0);
          };

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Historic Places Upload</h1>
    
        <div className="space-y-6">
          {/* Updated Tab Navigation with Makkah and Madina */}
          <div className="flex border-b border-gray-200">
            <button
              className={`py-4 px-6 text-center border-b-2 transition-colors flex-1 font-medium ${
                activeTab === "makkah"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("makkah")}
            >
              Makkah
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 transition-colors flex-1 font-medium ${
                activeTab === "madina"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("madina")}
            >
              Madina
            </button>
          </div>
          
          {/* Content section - updated title */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {activeTab === "makkah" ? "Makkah Historic Places" : "Madina Historic Places"}
            </h2>
            
            {/* Content Image Upload */}
                      <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Content Image</label>
                        <div className="flex items-center justify-center w-full border-2 border-dotted border-gray-300 rounded-lg mb-2">
                          {contentImagePreview ? (
                            <div className="relative w-full">
                              <Image
                                src={contentImagePreview}
                                alt="Content image"
                                width={300}
                                height={200}
                                className="object-cover w-full h-48 rounded-md"
                              />
                              <button
                                type="button"
                                onClick={() => removeContentImage()}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                              >
                                <MdClose />
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="flex flex-col items-center justify-center h-36 w-full cursor-pointer py-6"
                              onClick={() => document.getElementById("content-image-input")?.click()}
                            >
                              <MdImage className="text-gray-400 text-5xl mb-2" />
                              <p className="text-gray-500 text-sm">Upload a featured image for your content</p>
                              <p className="text-xs text-gray-400 mt-1">This image will be stored with your content</p>
                            </div>
                          )}
                          <input
                            id="content-image-input"
                            type="file"
                            onChange={handleContentImageChange}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter a name..."
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location Link</label>
                        <input
                          type="text"
                          value={locationLink}
                          onChange={(e) => setLocationLink(e.target.value)}
                          className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter Google Maps or location URL..."
                        />
                      </div>
                      
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <button 
                            type="button" 
                            onClick={addDescriptionField}
                            className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
                          >
                            <MdAdd className="mr-1" /> Add Description
                          </button>
                        </div>
                        
                        {description.map((desc, index) => (
                          <div key={`desc-${index}`} className="mb-2 relative">
                            <textarea
                              value={desc}
                              onChange={(e) => handleDescriptionChange(index, e.target.value)}
                              className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter description..."
                              rows={3}
                            />
                            {description.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDescriptionField(index)}
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                              >
                                <MdDelete />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">Paragraphs</label>
                          <button 
                            type="button" 
                            onClick={addParagraph}
                            className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
                          >
                            <MdAdd className="mr-1" /> Add Paragraph
                          </button>
                        </div>
                        
                        {paragraphs.map((para, paraIndex) => (
                          <div key={`para-${paraIndex}`} className="mb-6 p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-medium text-gray-700">Paragraph Title</label>
                              {paragraphs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeParagraph(paraIndex)}
                                  className="text-red-500 hover:text-red-700 text-sm flex items-center"
                                >
                                  <MdDelete className="mr-1" /> Remove Paragraph
                                </button>
                              )}
                            </div>
                            
                            <input
                              type="text"
                              value={para.title}
                              onChange={(e) => handleParagraphTitleChange(paraIndex, e.target.value)}
                              className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                              placeholder="Enter paragraph title..."
                            />
                            
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-medium text-gray-700">Paragraph Description</label>
                              <button 
                                type="button" 
                                onClick={() => addParagraphDescription(paraIndex)}
                                className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
                              >
                                <MdAdd className="mr-1" /> Add Description
                              </button>
                            </div>
                            
                            {para.description.map((desc, descIndex) => (
                              <div key={`para-${paraIndex}-desc-${descIndex}`} className="mb-2 relative">
                                <textarea
                                  value={desc}
                                  onChange={(e) => handleParagraphDescriptionChange(paraIndex, descIndex, e.target.value)}
                                  className="w-full p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Enter paragraph description..."
                                  rows={3}
                                />
                                {para.description.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeParagraphDescription(paraIndex, descIndex)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                  >
                                    <MdDelete />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
          </div>


         <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images</label>
                   <div className="flex flex-col items-center justify-center w-full p-4 border-2 border-dotted border-gray-400 rounded-lg">
                     {previewUrls.length > 0 ? (
                       <div className="grid grid-cols-3 gap-2 w-full">
                         {previewUrls.map((url, index) => (
                           <div key={index} className="relative">
                             <Image
                               src={url}
                               alt={`Selected image ${index + 1}`}
                               width={100}
                               height={100}
                               className="object-cover w-full h-24 rounded-lg"
                             />
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 removeImage(index);
                               }}
                               className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                             >
                               <MdClose />
                             </button>
                           </div>
                         ))}
                         <div 
                           className="flex flex-col items-center justify-center h-24 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200"
                           onClick={() => document.getElementById("image-input")?.click()}
                         >
                           <span className="text-3xl text-gray-400">+</span>
                           <span className="text-xs text-gray-500">Add More</span>
                         </div>
                       </div>
                     ) : (
                       <div 
                         className="flex flex-col items-center cursor-pointer"
                         onClick={() => document.getElementById("image-input")?.click()}
                       >
                         <Image
                           src="/add-image.png"
                           alt="Upload Placeholder"
                           width={64}
                           height={64}
                           className="w-16 h-16 opacity-50"
                         />
                         <p className="text-gray-500 text-sm mt-2">Upload Images</p>
                       </div>
                     )}
                     <input
                       id="image-input"
                       type="file"
                       onChange={handleImageChange}
                       accept="image/*"
                       className="hidden"
                       multiple
                     />
                   </div>
                 </div>
         
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Choose Files {otherFiles.length > 0 && `(${otherFiles.length} selected)`}
                   </label>
                   <input
                     type="file"
                     onChange={handleFileChange}
                     className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                     multiple
                   />
                   {otherFiles.length > 0 && (
                     <div className="mt-2 text-xs text-gray-500">
                       {otherFiles.map((file, index) => (
                         <div key={index} className="flex items-center justify-between py-1">
                           <span>{file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name}</span>
                           <button 
                             onClick={() => setOtherFiles(otherFiles.filter((_, i) => i !== index))}
                             className="text-red-500 hover:text-red-700"
                           >
                             <MdClose />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
         
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Upload Audio {audioFiles.length > 0 && `(${audioFiles.length} selected)`}
                   </label>
                   <input
                     type="file"
                     accept="audio/*"
                     onChange={handleAudioChange}
                     className="text-gray-500 text-sm"
                     multiple
                   />
                   {audioFiles.length > 0 && (
                     <div className="mt-2 text-xs text-gray-500">
                       {audioFiles.map((file, index) => (
                         <div key={index} className="flex items-center justify-between py-1">
                           <span>{file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name}</span>
                           <button 
                             onClick={() => setAudioFiles(audioFiles.filter((_, i) => i !== index))}
                             className="text-red-500 hover:text-red-700"
                           >
                             <MdClose />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
         
                 <button
                   onClick={handleUpload}
                   disabled={(imageFiles.length === 0 && otherFiles.length === 0 && audioFiles.length === 0)}
                   className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                 >
                   Upload Content
                 </button>
         
                 {progress > 0 && (
                   <div className="pt-4">
                     <div className="flex justify-between mb-1">
                       <span className="text-sm font-medium text-blue-600">Progress</span>
                       <span className="text-sm font-medium text-blue-600">{progress.toFixed(1)}%</span>
                     </div>
                     <div className="h-2 bg-gray-200 rounded-full">
                       <div
                         className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                         style={{ width: `${progress}%` }}
                       ></div>
                     </div>
                   </div>
                 )}
         
                 {error && (
                   <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                     {error}
                   </div>
                 )}
        </div>
      </div>
    );
};

export default HistoricPlaces;