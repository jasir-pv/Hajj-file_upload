"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FaTrash } from "react-icons/fa";
import Image from "next/image";
import { storage, firestore } from "../../utils/firebase";

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
  folderId: number;
  timestamp: string;
  files: string[];
  images: string[];
  audios: string[];
}

const HistoricPlacesEditPage = () => {
  const searchParams = useSearchParams();
  const collectionName = searchParams.get("collection");
  const id = searchParams.get("id");

  const [content, setContent] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newContentImage, setNewContentImage] = useState<File | null>(null);
  const [contentImagePreview, setContentImagePreview] = useState<string | null>(
    null
  );
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newAudioFiles, setNewAudioFiles] = useState<File[]>([]);
  const [newOtherFiles, setNewOtherFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<{
    images: string[];
    audios: string[];
    others: string[];
  }>({ images: [], audios: [], others: [] });
  const [newParagraphs, setNewParagraphs] = useState<ParagraphItem[]>([]);

  useEffect(() => {
    if (!storage || !firestore) {
      setError(
        "Firebase services not initialized. Please check your environment variables and refresh the page."
      );
      setIsLoading(false);
      return;
    }

    if (collectionName && id) {
      loadContent();
    }
  }, [collectionName, id]);

  const loadContent = async () => {
    if (!storage || !firestore) {
      setError("Firebase services not initialized");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      // Load content from Firestore
      const contentRef = doc(firestore, collectionName!, id!);
      const contentSnap = await getDoc(contentRef);

      if (!contentSnap.exists()) {
        setError("Content not found");
        setIsLoading(false);
        return;
      }

      const contentData = contentSnap.data() as ContentData;
      setContent(contentData);
      if (contentData.content_image) {
        setContentImagePreview(contentData.content_image);
      }

      // Fetch existing files from storage
      const folderRef = ref(
        storage,
        `${contentData.category}/${contentData.folderId}`
      );
      const folderContents = await listAll(folderRef);

      const files = folderContents.items.map((item) => item.fullPath);

      const images = files.filter(
        (file) => file.includes("image_") && !file.includes("content_image_")
      );

      const audios = files.filter(
        (file) =>
          file.includes("audio_") ||
          file.endsWith(".mp3") ||
          file.endsWith(".wav")
      );

      const others = files.filter(
        (file) =>
          !file.includes("image_") &&
          !file.includes("audio_") &&
          !file.includes("content_image_") &&
          !file.endsWith(".mp3") &&
          !file.endsWith(".wav") &&
          !file.includes("content_metadata")
      );

      setExistingFiles({
        images: await Promise.all(
          images.map(async (path) => {
            const fileRef = ref(storage!, path);
            return await getDownloadURL(fileRef);
          })
        ),
        audios: await Promise.all(
          audios.map(async (path) => {
            const fileRef = ref(storage!, path);
            return await getDownloadURL(fileRef);
          })
        ),
        others: await Promise.all(
          others.map(async (path) => {
            const fileRef = ref(storage!, path);
            return await getDownloadURL(fileRef);
          })
        ),
      });
    } catch (err) {
      setError("Failed to load content");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setNewContentImage(file);
        const preview = URL.createObjectURL(file);
        setContentImagePreview(preview);
      } else {
        setError("Please select a valid image file");
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validImages = files.filter((file) =>
        file.type.startsWith("image/")
      );
      setNewImageFiles((prev) => [...prev, ...validImages]);

      // Create preview URLs
      const newPreviews = validImages.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validAudios = files.filter((file) =>
        file.type.startsWith("audio/")
      );
      setNewAudioFiles((prev) => [...prev, ...validAudios]);
    }
  };

  const handleOtherFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewOtherFiles((prev) => [...prev, ...files]);
    }
  };

  const addParagraph = () => {
    setNewParagraphs([...newParagraphs, { title: "", description: [""] }]);
  };

  const removeParagraph = (index: number) => {
    setNewParagraphs(newParagraphs.filter((_, i) => i !== index));
  };

  const addParagraphDescription = (paraIndex: number) => {
    const updatedParagraphs = [...newParagraphs];
    updatedParagraphs[paraIndex].description.push("");
    setNewParagraphs(updatedParagraphs);
  };

  const removeParagraphDescription = (paraIndex: number, descIndex: number) => {
    const updatedParagraphs = [...newParagraphs];
    updatedParagraphs[paraIndex].description.splice(descIndex, 1);
    setNewParagraphs(updatedParagraphs);
  };

  const handleParagraphTitleChange = (index: number, value: string) => {
    const updatedParagraphs = [...newParagraphs];
    updatedParagraphs[index].title = value;
    setNewParagraphs(updatedParagraphs);
  };

  const handleParagraphDescriptionChange = (
    paraIndex: number,
    descIndex: number,
    value: string
  ) => {
    const updatedParagraphs = [...newParagraphs];
    updatedParagraphs[paraIndex].description[descIndex] = value;
    setNewParagraphs(updatedParagraphs);
  };

  const handleUpdate = async () => {
    if (!content || !collectionName || !id || !storage || !firestore) return;

    try {
      setIsUpdating(true);
      setProgress(0);
      setError("");
      let contentImageUrl = content.content_image;

      // Upload new content image if selected
      if (newContentImage) {
        const fileExtension = newContentImage.name.split(".").pop() || "";
        const timestamp = new Date().getTime();
        const cleanFileName =
          `content_image_${timestamp}.${fileExtension}`.toLowerCase();

        const storagePath = `${content.category}/${content.folderId}/${cleanFileName}`;
        const storageRef = ref(storage!, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, newContentImage);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(progress);
            },
            (error) => {
              reject(error);
            },
            async () => {
              try {
                contentImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      }

      // Upload new files
      const allFiles = [...newImageFiles, ...newAudioFiles, ...newOtherFiles];
      const totalFiles = allFiles.length;
      let uploadedCount = 0;

      const newFiles = await Promise.all(
        allFiles.map(async (file: File) => {
          if (!file) return null;
          const fileExtension = file.name.split(".").pop() || "";
          const timestamp = new Date().getTime();
          const cleanFileName = `file_${timestamp}.${fileExtension}`.toLowerCase();
          const storagePath = `${content.category}/${content.folderId}/${cleanFileName}`;
          const storageRef = ref(storage!, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, file);
          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress =
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const overallProgress = ((uploadedCount + (progress / 100)) / totalFiles) * 100;
                setProgress(overallProgress);
              },
              (error) => {
                reject(error);
              },
              () => {
                uploadedCount++;
                resolve();
              }
            );
          });
          return await getDownloadURL(uploadTask.snapshot.ref);
        })
      );

      // Update Firestore document
      const docRef = doc(firestore!, collectionName, id);
      await setDoc(
        docRef,
        {
          ...content,
          content_image: contentImageUrl,
          files: [...(content.files || []), ...newFiles.filter(Boolean)],
          images: [
            ...(content.images || []),
            ...newFiles.filter(
              (f): f is string => f !== null && f.startsWith("image_")
            ),
          ],
          audios: [
            ...(content.audios || []),
            ...newFiles.filter(
              (f): f is string => f !== null && f.startsWith("audio_")
            ),
          ],
        },
        { merge: true }
      );

      // Reset form state
      setNewContentImage(null);
      setContentImagePreview(null);
      setNewImageFiles([]);
      setNewAudioFiles([]);
      setNewOtherFiles([]);
      setPreviewUrls([]);
      setNewParagraphs([]);
      setProgress(0);
      setError("");
      
      // Reload the page to show updated content
      window.location.reload();
    } catch (err) {
      setError("Failed to update content");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteImage = async (url: string, index: number) => {
    if (!storage) return;
    try {
      const fileRef = ref(storage!, url);
      await deleteObject(fileRef);
      setExistingFiles((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    } catch {
      setError("Failed to delete image");
    }
  };

  const handleDeleteAudio = async (url: string, index: number) => {
    if (!storage) return;
    try {
      const fileRef = ref(storage!, url);
      await deleteObject(fileRef);
      setExistingFiles((prev) => ({
        ...prev,
        audios: prev.audios.filter((_, i) => i !== index),
      }));
    } catch {
      setError("Failed to delete audio file");
    }
  };

  const handleDeleteFile = async (url: string, index: number) => {
    if (!storage) return;
    try {
      const fileRef = ref(storage!, url);
      await deleteObject(fileRef);
      setExistingFiles((prev) => ({
        ...prev,
        others: prev.others.filter((_, i) => i !== index),
      }));
    } catch {
      setError("Failed to delete file");
    }
  };

  if (isLoading) {
    return (
      <main className="w-full h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading content...</p>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="w-full h-screen flex items-center justify-center">
        <p className="text-red-500">{error || "Content not found"}</p>
      </main>
    );
  }

  return (
    <main className="w-full h-full p-6 text-black">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Historic Place</h1>

        {/* Content Image */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Content Image
          </label>
          <div className="flex items-center space-x-4">
            {contentImagePreview && (
              <div className="relative">
                <Image
                  src={contentImagePreview}
                  alt="Content"
                  width={150}
                  height={150}
                  className="rounded-lg object-cover"
                />
                <button
                  onClick={() => {
                    setContentImagePreview(null);
                    setNewContentImage(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleContentImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            value={content.name}
            onChange={(e) => setContent({ ...content, name: e.target.value })}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Location Link */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Location Link
          </label>
          <input
            type="text"
            value={content.location_link}
            onChange={(e) => setContent({ ...content, location_link: e.target.value })}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={content.description.join("\n")}
            onChange={(e) =>
              setContent({
                ...content,
                description: e.target.value.split("\n"),
              })
            }
            rows={4}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Existing Paragraphs */}
        {content.paragraphs && content.paragraphs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">
              Existing Paragraphs
            </h3>
            {content.paragraphs.map((paragraph, index) => (
              <div
                key={`existing-para-${index}`}
                className="space-y-2 p-4 border rounded-lg"
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={paragraph.title}
                    onChange={(e) => {
                      const updatedParagraphs = [...content.paragraphs];
                      updatedParagraphs[index].title = e.target.value;
                      setContent({ ...content, paragraphs: updatedParagraphs });
                    }}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  {paragraph.description.map((desc, descIndex) => (
                    <div
                      key={`existing-desc-${index}-${descIndex}`}
                      className="flex items-center space-x-2"
                    >
                      <textarea
                        value={desc}
                        onChange={(e) => {
                          const updatedParagraphs = [...content.paragraphs];
                          updatedParagraphs[index].description[descIndex] =
                            e.target.value;
                          setContent({
                            ...content,
                            paragraphs: updatedParagraphs,
                          });
                        }}
                        rows={2}
                        className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => {
                          const updatedParagraphs = [...content.paragraphs];
                          updatedParagraphs[index].description.splice(
                            descIndex,
                            1
                          );
                          setContent({
                            ...content,
                            paragraphs: updatedParagraphs,
                          });
                        }}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const updatedParagraphs = [...content.paragraphs];
                      updatedParagraphs[index].description.push("");
                      setContent({ ...content, paragraphs: updatedParagraphs });
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
                  >
                    Add Description
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Paragraphs */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">
              New Paragraphs
            </h3>
            <button
              onClick={addParagraph}
              className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
            >
              Add Paragraph
            </button>
          </div>
          {newParagraphs.map((paragraph, index) => (
            <div
              key={`new-para-${index}`}
              className="space-y-2 p-4 border rounded-lg"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-700">
                  Paragraph {index + 1}
                </h4>
                <button
                  onClick={() => removeParagraph(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={paragraph.title}
                  onChange={(e) =>
                    handleParagraphTitleChange(index, e.target.value)
                  }
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                {paragraph.description.map((desc, descIndex) => (
                  <div
                    key={`new-desc-${index}-${descIndex}`}
                    className="flex items-center space-x-2"
                  >
                    <textarea
                      value={desc}
                      onChange={(e) =>
                        handleParagraphDescriptionChange(
                          index,
                          descIndex,
                          e.target.value
                        )
                      }
                      rows={2}
                      className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() =>
                        removeParagraphDescription(index, descIndex)
                      }
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addParagraphDescription(index)}
                  className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
                >
                  Add Description
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* File Uploads */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={url}
                      alt={`Preview ${index + 1}`}
                      width={100}
                      height={100}
                      className="rounded-lg object-cover"
                    />
                    <button
                      onClick={() => {
                        setPreviewUrls((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                        setNewImageFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Audio Files
            </label>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleAudioChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {newAudioFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {newAudioFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-600">{file.name}</span>
                    <button
                      onClick={() =>
                        setNewAudioFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Other Files
            </label>
            <input
              type="file"
              multiple
              onChange={handleOtherFilesChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {newOtherFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {newOtherFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-600">{file.name}</span>
                    <button
                      onClick={() =>
                        setNewOtherFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Existing Files Section */}
        <div className="space-y-4">
          {/* Existing Images */}
          {existingFiles.images.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Existing Images
              </label>
              <div className="grid grid-cols-4 gap-2">
                {existingFiles.images.map((url, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={url}
                      alt={`Existing image ${index + 1}`}
                      width={100}
                      height={100}
                      className="rounded-lg object-cover"
                    />
                    <button
                      onClick={() => handleDeleteImage(url, index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Audio Files */}
          {existingFiles.audios.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Existing Audio Files
              </label>
              <div className="space-y-1">
                {existingFiles.audios.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-600">
                      Audio File {index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <audio controls className="h-8">
                        <source src={url} type="audio/mpeg" />
                      </audio>
                      <button
                        onClick={() => handleDeleteAudio(url, index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Other Files */}
          {existingFiles.others.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Existing Other Files
              </label>
              <div className="space-y-1">
                {existingFiles.others.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        File {index + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-64 h-32 border rounded overflow-hidden cursor-pointer relative"
                        >
                          <iframe
                            src={url}
                            className="w-full h-full pointer-events-none"
                            title={`File Preview ${index + 1}`}
                          />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(url, index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isUpdating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Upload Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* Update Button */}
        <div className="flex justify-end">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isUpdating ? "Updating..." : "Update Content"}
          </button>
        </div>
      </div>
    </main>
  );
};

export default HistoricPlacesEditPage; 