// import { useState } from "react";



//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [otherFile, setOtherFile] = useState<File | null>(null);
//   const [text, setText] = useState("");
//   const [audioFile, setAudioFile] = useState<File | null>(null);
//   const [progress, setProgress] = useState(0);
//   const [downloadURL, setDownloadURL] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [previewUrl, setPreviewUrl] = useState<string | null>(null);


//   // Handle Image Upload
//   export const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setError("");
//     if (e.target.files && e.target.files[0]) {
//       const selectedFile = e.target.files[0];

      
//       if (selectedFile.type.startsWith("image/")) {
//         setImageFile(selectedFile);
//         const preview = URL.createObjectURL(selectedFile);
//         setPreviewUrl(preview);
//       } else {
//         setError("Please select a valid image file.");
//       }
//     }
//   };

//   // Handle Other File Upload (PDFs, Docs, etc.)
//  export const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setError("");
//     if (e.target.files && e.target.files[0]) {
//       setOtherFile(e.target.files[0]);
//     }
//   };

//  export const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setError("");
//     if (e.target.files && e.target.files[0]) {
//       const selectedFile = e.target.files[0];
//       if (!selectedFile.type.startsWith('audio/')) {
//         setError("Please select an audio file");
//         return;
//       }
//       setAudioFile(selectedFile);
//     }
//   };