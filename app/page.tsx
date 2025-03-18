"use client";

import { useState, useEffect } from "react";
import { ref, uploadBytesResumable, getDownloadURL, listAll, getStorage } from "firebase/storage";
import { signInAnonymousUser } from "../utils/firebase";
import { MdClose } from "react-icons/md";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";


  const storage = getStorage()

  interface PageProps {
    params: {
      id: string;
    };
  }

export default function Home({ params } : PageProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [otherFile, setOtherFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [_downloadURL, _setDownloadURL] = useState("");
  const [error, setError] = useState("");
  const [loading, _setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [_audioProgress, _setAudioProgress] = useState(0);


  const router = useRouter();
  const ritualIdStr = params.id as string
  console.log("ritual str:",ritualIdStr)
  const ritualId = parseInt(ritualIdStr, 10) || 5;
  console.log("ritual id:", ritualId)


  useEffect(() => {
    signInAnonymousUser().catch(() => {
      setError("Authentication failed. Uploads may not work properly.");
    });
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle Image Upload
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

  // Handle Other File Upload (PDFs, Docs, etc.)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      setOtherFile(e.target.files[0]);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('audio/')) {
        setError("Please select an audio file");
        return;
      }
      setAudioFile(selectedFile);
    }
  };


  // upload_--------------------------------------------------------------------------

  const handleUpload = async () => {
    if (!imageFile && !otherFile && !audioFile) {
      setError("Please select a file first");
      return;
    }

    if (!storage) {
      setError("Storage service not available");
      return;
    }

    try {
      const fileToUpload = imageFile || otherFile || audioFile;
      if (!fileToUpload) return;

      const storagePath =`demo/${ritualId}`;
      console.log("storage path",storagePath)
      const storageRef = ref(storage, storagePath);
      console.log("storage ref:",storageRef)
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
        },
        (error) => {
          setError(`Upload failed: ${error.message}`);
          setProgress(0);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((url) => {
            // setDownloadURL(url);
            console.log("Upload successful! File available at:", url);
            alert("Upload successful!");
            setError("");
          });
        }
      );
    } catch (err) {
      setError("Failed to start upload");
      console.error(err);
    }
  };


  //----- Fetch all files ------------------------------------------

      const listRef = ref(storage, 'demo');
    listAll(listRef)
      .then((res: any) => {
      console.log("str:", res)
      }).catch((error) => {
        console.log('error occured',error)
      });

 // -------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">File Upload</h1>

        <div className="space-y-6">

          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-2 border rounded mb-2 h-32 text-gray-700 text-sm"
              placeholder="Enter your text here..."
            />
          </div>


          {/* Image Upload Section */}
          <div className="flex flex-col items-center justify-center w-full p-4 border-2 border-dotted border-gray-400 rounded-lg">
            {previewUrl ? (
              <div className="relative">
                <Image
                  src={previewUrl}
                  alt="Selected file preview"
                  className="object-cover w-32 h-32 rounded-lg"
                  onClick={() => document.getElementById("image-input")?.click()}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFile(null);
                    setPreviewUrl(null);
                    // setDownloadURL("");
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
                  width={64} // Set width
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

          {/* File Upload Section (Other Files like PDFs, DOCs) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose File</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Audio</label>
            <input type="file" accept="audio/*" onChange={handleAudioChange} className="text-gray-500 text-sm"/>
          </div>



          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={(!imageFile && !otherFile) || !text || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Uploading..." : "Upload Content"}
          </button>

          {/* Upload Progress */}
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

          {/* Error Messages */}
          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
