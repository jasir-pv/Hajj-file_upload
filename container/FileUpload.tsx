"use client";
  
import { useState, useEffect } from "react";
import { ref, uploadBytesResumable, getDownloadURL, getStorage, listAll } from "firebase/storage";
import { signInAnonymousUser } from "../utils/firebase";
import { MdClose } from "react-icons/md";
import Image from "next/image";


const storage = getStorage()

const FileUpload = () => {

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [otherFiles, setOtherFiles] = useState<File[]>([]);
    const [text, setText] = useState("");
    const [audioFiles, setAudioFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [nextFolderId, setNextFolderId] = useState<number | null>(null);
  
    useEffect(() => {
      signInAnonymousUser().catch(() => {
        setError("Authentication failed. Uploads may not work properly.");
      });
    }, []);
  
    useEffect(() => {
      return () => {
        previewUrls.forEach(url => {
          URL.revokeObjectURL(url);
        });
      };
    }, [previewUrls]);
  
    useEffect(() => {
      const fetchHighestFolderId = async () => {
        try {
          const demoRef = ref(storage, 'demo');
          const result = await listAll(demoRef);
          
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
  
    const handleUpload = async () => {
      if (imageFiles.length === 0 && otherFiles.length === 0 && audioFiles.length === 0) {
        setError("Please select at least one file to upload");
        return;
      }
  
      if (!storage) {
        setError("Storage service not available");
        return;
      }
    
      if (nextFolderId === null) {
        setError("Preparing upload location, please try again in a moment");
        return;
      }
  
      try {
        const filesToUpload: {file: File, type: string}[] = [];
        
        imageFiles.forEach(file => filesToUpload.push({file, type: "image"}));
        otherFiles.forEach(file => filesToUpload.push({file, type: "file"}));
        audioFiles.forEach(file => filesToUpload.push({file, type: "audio"}));
        
        if (filesToUpload.length === 0) return;
        
        if (text) {
          const textRef = ref(storage, `demo/${nextFolderId}/text_content.txt`);
          const textBlob = new Blob([text], { type: 'text/plain' });
          await uploadBytesResumable(textRef, textBlob);
        }
        
        let completedUploads = 0;
        const totalFiles = filesToUpload.length;
        
        for (const {file, type} of filesToUpload) {
          const fileExtension = file.name.split('.').pop() || '';
          const timestamp = new Date().getTime() + filesToUpload.indexOf({file, type});
          const cleanFileName = `${type}_${timestamp}.${fileExtension}`.toLowerCase();
          
          const storagePath = `demo/${nextFolderId}/${cleanFileName}`;
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
              await getDownloadURL(uploadTask.snapshot.ref);
              completedUploads++;
              
              if (completedUploads === totalFiles) {
                alert("All uploads successful!");
                setError("");
                setNextFolderId(prevId => prevId !== null ? prevId + 1 : 1);
                
                setImageFiles([]);
                setOtherFiles([]);
                setAudioFiles([]);
                setPreviewUrls([]);
                setText("");
              }
            }
          );
        }
      } catch (err) {
        setError("Failed to start upload");
        console.error(err);
      }
    };

  return (
   
    <div>


    <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">File Upload</h1>
  
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Enter Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 border rounded mb-2 h-32 text-gray-700 text-sm"
          placeholder="Enter your text here..."
        />
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

  )
}

export default FileUpload;